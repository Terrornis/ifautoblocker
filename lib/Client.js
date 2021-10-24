const fs = require('fs');
const path = require('path');
const axios = require('axios');
const querystring = require ('querystring');
const Page = require('./Page');
const User = require('./User');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { stdout } = require('process');

class Client {
    _user_agent = 'iFunny/7.12.1(1120053) Android/11 (samsung; GT-N8013; samsung)';
    _client_id = 'MsOIJ39Q28';
    _client_secret = 'PTDc3H8a)Vi=UYap';
    _url = 'https://api.ifunny.mobi/v4';
    basic_token = 'NzNERTFFOUVBRkZGOTc4RUI5MDcwMjYxNEU4NkZCOTY2MDY3MDE4MUE3N0Q4NzhGNkYxN0VCMTc3MDU4NUZBRTcyN0JFRDlDX01zT0lKMzlRMjg6YWZlNzI4ZjkwZTZkYzU1Mzc0OTQwM2JhMTZiNzhmZGUzMzQ4NmRmZg==';
    access_token = null;

    getHeaders() {
        return {
            'user-agent': this._user_agent,
            'authorization': this.access_token ? `Bearer ${this.access_token}` : `Basic ${this.basic_token}`,
            'ifunny-project-id': 'iFunny',
            'applicationstate': '1'
        };
    }

    async login(email, password) {
        // Check for the existence of tokens.json
        try {
            fs.statSync(path.resolve(__dirname, './tokens.json'));
        } catch (err) {
            if (err.code == 'ENOENT') {
                console.log(chalk.red(`${chalk.underline(path.resolve(__dirname, './tokens.json'))} does not exist... Making new.`));
                fs.writeFileSync(path.resolve(__dirname, './tokens.json'), JSON.stringify({}, null, 2));
            } else {
                console.log(chalk.bgRed.white.bold('Something went terribly wrong...'));
                console.error(err);
                process.exit(-1);
            }
        }

        let tokens = JSON.parse(fs.readFileSync(path.resolve(__dirname, './tokens.json'), 'utf8'));

        if (email in tokens) {
            console.log('Found Bearer token.');
            this.access_token = tokens[email];
            return;
        }

        console.log(chalk.red('Bearer token not found... Requesting new.'));

        let formdata = {
            grant_type: 'password',
            username: email,
            password: password
        };

        let response = await axios({
            method: 'post',
            url: `${this._url}/oauth2/token`,
            data: querystring.stringify(formdata),
            headers: this.getHeaders()
        });

        if (response.status == 400) {
            console.log(chalk.red('Incorrect email or password.'));
            process.exit(-2);
        }

        this.access_token = response.data.access_token;
        tokens[email] = this.access_token;

        fs.writeFile(path.resolve(__dirname, './tokens.json'), JSON.stringify(tokens, null, 2), err => {
            if (err) throw err;
        });

        console.log(chalk.green(`Acquired new Bearer token ${chalk.italic(this.access_token)} for email ${chalk.italic(email)}`));
    }

    async getPaginatedTag(tag, opts = {limit: 30, next: undefined}) {
        let response = await axios({
            method: 'get',
            url: `${this._url}/search/content`,
            params: opts.next ? {
                tag: tag,
                limit: opts.limit,
                next: opts.next,
            } : {
                tag: tag,
                limit: opts.limit,
            },
            headers: this.getHeaders()
        });

        return new Page(response.data.data.content, {limit: opts.limit, tag});
    }

    async getPaginatedFeatured(opts = {limit: 30, next: undefined}) {
        let response = await axios({
            method: 'get',
            url: `${this._url}/feeds/featured`,
            params: opts.next ? {
                limit: opts.limit,
                next: opts.next,
                is_new: true
            } : {
                limit: opts.limit,
                is_new: true
            },
            headers: this.getHeaders()
        });

        return new Page(response.data.data.content, {limit: opts.limit});
    }

    // TODO: Combine cull tag and cull feature functions
    // TODO: Make this not an eyesore
    // TODO: Dont request data for users we've already scanned
    // TODO: Dont attempt to block users we've already blocked
    // TODO: Find better way to space out inquiry 
    // TODO: Find better way to pass variables in opts
    // TODO: Handle case -> No more pages
    // TODO: Handle case -> Ran out of new features
    // TODO: Handle case -> Non 200 responses
    // TODO: Think of more TODOs!

    async cullUsersFromTag(tag, opts = { daysThreshold: 100, limit: 30, next: undefined }) {
        stdout.write(`Getting ${chalk.italic(opts.limit)} posts from tag ${chalk.italic(tag)}... `);
        var page = await this.getPaginatedTag(tag, { limit: opts.limit, next: opts.next});
        // Check actual post count
        if (page.items.length != opts.limit) {
            stdout.write(chalk.red(`Requested ${opts.limit} but got ${page.items.length} instead.\r\n`))
        } else {
            stdout.write(chalk.green('Got!\r\n'));
        }

        for (var i = 0; i < page.items.length; i++) {
            await this.sleep(3000);
            stdout.write('\r\n');

            stdout.write(`Post ${chalk.green.italic(i + 1)} out of ${chalk.green.italic(page.items.length)}:\r\n`)
            stdout.write(`\tGetting info for user ${chalk.italic(page.items[i].creator.id)}... `);
            var user = await this.getUser(page.items[i].creator.id);
            stdout.write(chalk.green('Got!\r\n'));

            if (user.days < opts.daysThreshold) {
                stdout.write(chalk.yellow(`\tUser ${chalk.italic(user.nick)} has less than ${chalk.italic(opts.daysThreshold)} days (${user.days})!\r\n`));
                stdout.write(chalk.yellow(`\tBlocking user ${chalk.italic(user.nick)} with id ${chalk.italic(user.id)}... `));
                this.block(user);
                stdout.write(chalk.yellow('Blocked!\r\n'));
            } else {
                stdout.write(`\tUser ${chalk.italic(user.nick)} has more than ${chalk.italic(opts.daysThreshold)} days (${user.days}).\r\n\tSkipped!\r\n`);
            }
        }

        console.log();
        await inquirer.prompt([{
            name: 'continue',
            type: 'confirm',
            message: `Scrub the next page? (${chalk.italic(opts.limit)} more posts)`
        }]).then(answer => {
            console.log();
            if (answer.continue) this.cullUsersFromTag(tag, {daysThreshold: opts.daysThreshold, limit: opts.limit, next: page.next});
        });
    }

    async cullUsersFromFeatured(opts = { daysThreshold: 100, limit: 30, next: undefined}) {
        stdout.write(`Getting ${chalk.italic(opts.limit)} posts from featured... `);
        var page = await this.getPaginatedFeatured({limit: opts.limit, next: opts.next});
        // Check actual post count
        if (page.items.length != opts.limit) {
            stdout.write(chalk.red(`Requested ${opts.limit} but got ${page.items.length} instead.\r\n`))
        } else {
            stdout.write(chalk.green('Got!\r\n'));
        }

        for (var i = 0; i < page.items.length; i++) {
            await this.sleep(3000);
            stdout.write('\r\n');

            stdout.write(`Post ${chalk.green.italic(i + 1)} out of ${chalk.green.italic(page.items.length)}:\r\n`)
            stdout.write(`\tGetting info for user ${chalk.italic(page.items[i].creator.id)}... `);
            var user = await this.getUser(page.items[i].creator.id);
            stdout.write(chalk.green('Got!\r\n'));

            if (user.days < opts.daysThreshold) {
                stdout.write(chalk.yellow(`\tUser ${chalk.italic(user.nick)} has less than ${chalk.italic(opts.daysThreshold)} days (${user.days})!\r\n`));
                stdout.write(chalk.yellow(`\tBlocking user ${chalk.italic(user.nick)} with id ${chalk.italic(user.id)}... `));
                this.block(user);
                stdout.write(chalk.yellow('Blocked!\r\n'));
            } else {
                stdout.write(`\tUser ${chalk.italic(user.nick)} has more than ${chalk.italic(opts.daysThreshold)} days (${user.days}).\r\n\tSkipped!\r\n`);
            }

            stdout.write('\tSending post read notice... ');
            await this.sendFeaturedRead(page.items[i].id);
            stdout.write(chalk.green('Sent!\r\n'));
        }

        console.log();
        await inquirer.prompt([{
            name: 'continue',
            type: 'confirm',
            message: `Scrub the next page? (${chalk.italic(opts.limit)} more posts)`
        }]).then(answer => {
            console.log();
            if (answer.continue) this.cullUsersFromFeatured({daysThreshold: opts.daysThreshold, limit: opts.limit, next: page.next});
        });
    }

    async sendFeaturedRead(id) {
        let response = await axios({
            method: 'put',
            url: `${this._url}/reads/${id}`,
            headers: this.getHeaders()
        });
    }

    async getUser(id) {
        let response = await axios({
            method: 'get',
            url: `${this._url}/users/${id}`,
            headers: this.getHeaders()
        });

        return new User(response.data.data);
    }

    async block(user) {
        let response = await axios({
            method: 'put',
            url: `${this._url}/users/my/blocked/${user.id}`,
            params: {
                'type': 'installation'
            },
            headers: this.getHeaders()
        });
    }

    async sleep(ms) {
        await new Promise(res => setTimeout(res, ms));
    }
}

module.exports = Client;
