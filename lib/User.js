const axios = require('axios');

class User {
    raw = null;
    id = null;
    days = null;
    nick = null;

    constructor(raw) {
        this.raw = raw;
        this.id = raw.id;
        this.days = raw.meme_experience.days;
        this.nick = raw.nick;
    }
}

module.exports = User;