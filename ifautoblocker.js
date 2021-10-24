#!/usr/bin/env node
// TODO: DOCUMENT!!!!

const { program } = require('commander');
const Client = require('./lib/Client');
const client = new Client();

// Set arg options
program
    .requiredOption('-e, --email <string>', 'account email')
    .requiredOption('-p, --password <string>', 'account password')
    .option('-t, --tag <string>', 'scrub through a tag')
    .option('-d, --days <integer>', 'account age threshold', 100)
    .option('-l, --limit <integer>', 'amount of posts to retrieve per request', 30)
    .parse(process.argv);

const options = program.opts();

async function ifautoblocker() {
    await client.login(options.email, options.password);
    
    if (options.tag) {
        client.cullUsersFromTag(options.tag, {
            daysThreshold: options.days ? options.days : 100,
            limit: options.limit ? options.limit : 30
        });
        return;
    }

    client.cullUsersFromFeatured({
        daysThreshold: options.days ? options.days : 100,
        limit: options.limit ? options.limit : 30
    });
}

ifautoblocker();