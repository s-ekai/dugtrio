const Dugtrio = require("dugtrio");
const BaseModel = Dugtrio.BaseModel;

module.exports = class Twitter extends BaseModel {
  constructor() {
    super();
    this.options = {
      'puppeteer': { headless: true, args: ['--lang=ja,en-US,en'] },
      'login': false,
      'test': false,
    }
  }
}
