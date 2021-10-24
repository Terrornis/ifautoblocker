## Installation
```sh
npm install -g ifautoblocker
```

## Usage
```
ifautoblocker -e <email> -p <password> [options]
```

```
ifautoblocker --help

Options:
  -e, --email <string>     account email
  -p, --password <string>  account password
  -t, --tag <string>       scrub through a tag
  -d, --days <integer>     account age threshold (default: 100)
  -l, --limit <integer>    amount of posts to retrieve per request (default: 30)
  -h, --help               display help for command
```

## About
An unfinished CLI tool for automatically blocking users under an amount of days.

Can scrub through the Featured page or a specified tag.

### What it can't do
Mostly handle some cases I've yet to implement. Here be dragons!

See the comment block in `/lib/Client.js`.

## License
MIT