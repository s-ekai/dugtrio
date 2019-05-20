const Twitter  = require("./Twitter.js")

module.exports = class User extends Twitter {
  constructor() {
    super();
    this.url = 'https://twitter.com/(:username)?lang=ja',
    this.primary = "username"
    this.columns = {
      'followersCount': function() { return Array.from(document.getElementsByTagName('a')).filter(e => e.dataset['nav'] === 'followers')[0].getElementsByClassName('ProfileNav-value')[0].innerText.replace(',', ''); },
      'followingsCount': function() { return Array.from(document.getElementsByTagName('a')).filter(e => e.dataset['nav'] === 'following')[0].getElementsByClassName('ProfileNav-value')[0].innerText.replace(',', ''); },
    }
    this.seed = {
      'url': 'https://www.wantedly.com/projects/(:esportscafe)',
      'role': 'number-origin',
      'sequence': { start: 1, end: 3 },
      'primary': function() { return Array.from(document.getElementsByClassName('company-name')).map(e => e.getElementsByTagName('a')[0].href.match(/companies\/([ -~]+)/)[1])},
    }
  }
}
