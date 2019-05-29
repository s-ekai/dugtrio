const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const Utility = require("./Utility.js")
const Progress = require('progress');

module.exports = class Diglett {

  constructor(instance) {
    const options = instance['options']
    this.puppeteerOption = options['puppeteer'] || { headless: true, args: ['--lang=en,en-US,ja'] }
    this.test = options['test']
    this.testPrimaryKeyElement = options['testPrimaryKeyElement']
    this.url = instance['url']
    this.columns = instance['columns']
    this.primary = instance['primary']
    this.seed = instance['seed']
    this.loginRequire = options['login']
    this.loginOption = instance['loginOption']
    this.tableName = instance.constructor.name.toLowerCase();
    this.className = instance.constructor.name;
    this.parentClassName = Object.getPrototypeOf(instance.constructor).name;
  }

  // INFO: for sleep
  async delay(page) {
    let delay = ((Math.random() * 3) + 1) * 2000;
    await page.waitFor(delay);
  }

  async login(page) {
    // config
    const username        = this.loginOption['username']
    const password        = this.loginOption['password']
    const url             = this.loginOption['url']
    const beforeClickPath = this.loginOption['beforeClickPath']
    const usernameForm    = this.loginOption['usernameForm']
    const passwordForm    = this.loginOption['passwordForm']
    const afterClickPath  = this.loginOption['afterClickPath']

    // jump page
    await page.goto(url, {waitUntil: 'networkidle2'});
    // if click is necessary
    if (beforeClickPath) {
      await page.click(beforeClickPath);
    }
    // typing
    await page.waitForSelector(usernameForm);
    await page.type(usernameForm, username);
    await page.type(passwordForm, password);
    // submit
    await Promise.all([
      page.click(afterClickPath),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);
    console.log("login success");
  }

  // INFO: main scraping method. only one time.
  async fetch(itemName) {

    if (this.test && await this.domChanged()) {
      console.log('dom had changed. so you modify column function or test option.')
      return {};
    }

    if (this.loginRequire) {
      await this.login(page)
    }

    const browser = await puppeteer.launch(this.puppeteerOption)
    const page = await browser.newPage()
    this.browserPid = browser.process().pid

    const url = this.url.replace(/\(.+\)/, itemName)
    await page.goto(url, {waitUntil: 'networkidle2'})
    await this.delay(page);

    const columnsJsonString = Utility.toJson(this.columns)

    const res = await page.evaluate((primaryKey, columnsJsonString, itemName) => {
      const params = {}

      function reviver(k, v) {
        if (typeof v === 'string' && v.match(/^function/)) {
            return Function.call(this, 'return ' + v)()
        }
        return v;
      }

      const columnsJson = JSON.parse(columnsJsonString, reviver)

      for(key in columnsJson) {
        try {
          params[key] = columnsJson[key].call();
        } catch(e) {
          params[key] = null;
        }
      }

      params[primaryKey] = itemName;
      return params
    }, this.primary, columnsJsonString, itemName)

    await browser.close()
    return res
  }

  async fetch_seed() {
    const browser = await puppeteer.launch(this.puppeteerOption)
    const page = await browser.newPage()

    const result = [];
    this.browserPid = browser.process().pid

    if (this.loginRequire) {
      await this.login(page)
    }

    switch(this.seed['role']) {
      case 'number': {

        let startNumber = this.seed['sequence']['start']
        let endNumber = this.seed['sequence']['end']
        let total = endNumber - startNumber;

        if (!startNumber || !endNumber) {
          console.log('Warning. Something wrong with next sequence config. are start and end number exists?')
          return;
        }

        try {
          for (let i = startNumber; i <= endNumber; i++) {
            console.log(`${i - startNumber} / ${total}`)
            let url = this.seed.url.replace(/\(.+\)/, i);
            await page.goto(url, {waitUntil: 'networkidle2'})
            await this.delay(page);

            let primaryJsonString = JSON.stringify(this.seed, Utility.replacer);
            let res = await page.evaluate((primaryJsonString) => {
              function reviver(k, v) {
                if (typeof v === 'string' && v.match(/^function/)) {
                    return Function.call(this, 'return ' + v)()
                }
                return v;
              }
              return JSON.parse(primaryJsonString, reviver).primary.call();
            }, primaryJsonString)

            let resLength = res.length;

            console.log(`${res}`)

            for (let n = 0; n < resLength; n++) {
              let params = {}
              let primaryColumn = this.primary;
              params[primaryColumn] = res[n];

              result.push(params)
            }
          }
        } catch(e) {
          console.log('Oups Something! Check out below message!')
          console.log(e)
        }
        await browser.close()
        console.log(result)
        return result;

        break;
      }

      // when you know parameter in url is consecutive number,
      // jump next page adding current parameter number and 1.
      case 'number-origin': {
        let startNumber = this.seed['sequence']['start']
        let endNumber = this.seed['sequence']['end']
        let total = endNumber - startNumber;

        if (!startNumber || !endNumber) {
          console.log('Warning. Something wrong with next sequence config. are start and end number exists?')
          return;
        }

        const bar = new Progress(` [:bar] :percent (:eta seconds) scraping ${this.className}::${this.parentClassName} ${this.primary} :itemName  `, {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: total
        });

        try {
          for (let i = startNumber; i <= endNumber; i++) {
            bar.tick({'itemName': i});
            let url = this.url.replace(/\(.+\)/, i);
            await page.goto(url, {waitUntil: 'networkidle2'})
            await this.delay(page);

            let columnsJsonString = JSON.stringify(this.columns, Utility.replacer);
            let res = await page.evaluate((columnsJsonString) => {
              function reviver(k, v) {
                if (typeof v === 'string' && v.match(/^function/)) {
                    return Function.call(this, 'return ' + v)()
                }
                return v;
              }
              let columnsJson = JSON.parse(columnsJsonString, reviver);
              let params = {}
              for(key in columnsJson) {
                try {
                  params[key] = columnsJson[key].call();
                } catch(e) {
                  params[key] = null;
                }
              }
              return params;
            }, columnsJsonString)
            res[this.primary] = i;
            result.push(res)
          }
        } catch(e) {
          console.log('Oups Something! Check out below message!')
          console.log(e)
        }
        await browser.close()
        return result;

        break;
      }

      // if we can't jump next page, oftern we can do  by clicking button.
      case 'button': {

        const url = this.seed.url;
        const buttonSelector = this.seed.buttonSelector;

        if (!buttonSelector) {
          console.log('Warning. buttonSelector is necessary!')
          return;
        }

        await page.goto(url, {waitUntil: 'networkidle2'})
        let delay = ((Math.random() * 1) + 1) * 1000;
        await page.waitFor(delay);

        let primaryJsonString = JSON.stringify(this.seed, Utility.replacer);
        let res = await page.evaluate((primaryJsonString) => {
          function reviver(k, v) {
            if (typeof v === 'string' && v.match(/^function/)) {
                return Function.call(this, 'return ' + v)()
            }
            return v;
          }
          return JSON.parse(primaryJsonString, reviver).primary.call();
        }, primaryJsonString)

        let resLength = res.length;
        if (resLength == 0) {
          break;
        }
        console.log(`${res}`)

        for (let n = 0; n < resLength; n++) {
          let params = {}
          let primaryColumn = this.primary;
          params[primaryColumn] = res[n];

          result.push(params)
        }

        let buttonExitsFlag = await page.$(buttonSelector);

        while (buttonExitsFlag) {
          try {
            await page.click(buttonSelector);
            let delay = ((Math.random() * 3) + 1) * 2000;
            await page.waitFor(delay);

            let primaryJsonString = JSON.stringify(this.seed, Utility.replacer);
            let res = await page.evaluate((primaryJsonString) => {
              function reviver(k, v) {
                if (typeof v === 'string' && v.match(/^function/)) {
                    return Function.call(this, 'return ' + v)()
                }
                return v;
              }
              return JSON.parse(primaryJsonString, reviver).primary.call();
            }, primaryJsonString)

            let resLength = res.length;

            console.log(`${res}`)

            for (let n = 0; n < resLength; n++) {
              let params = {}
              let primaryColumn = this.primary;
              params[primaryColumn] = res[n];

              result.push(params)
            }

            buttonExitsFlag = await page.$(buttonSelector);
          } catch(e) {
            console.log('Oups Something! Check out below message!')
            console.log(e)
            buttonExitsFlag = false
          }
        }

        await browser.close()
        console.log(result)
        return result;
        break;
      }
    }
  }

  // if you have data in DBMS
  async update(datas) {
    const browser = await puppeteer.launch(this.puppeteerOption)
    const page = await browser.newPage()

    const result = [];
    this.browserPid = browser.process().pid

    if (this.loginRequire) {
      await this.login(page)
    }

    const total = datas.length;

    const bar = new Progress(` [:bar] :percent (:eta seconds) scraping ${this.className}::${this.parentClassName} ${this.primary} :itemName  `, {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: total
    });

    try {
      for (let i = 0; i < total; i++) {
        let itemName = datas[i]
        bar.tick({'itemName': itemName});

        let url = this.url.replace(/\(.+\)/, itemName);
        await page.goto(url, {waitUntil: 'networkidle2'})
        await this.delay(page);

        let columnsJsonString = JSON.stringify(this.columns, Utility.replacer);
        let res = await page.evaluate((columnsJsonString) => {
          function reviver(k, v) {
            if (typeof v === 'string' && v.match(/^function/)) {
                return Function.call(this, 'return ' + v)()
            }
            return v;
          }
          let columnsJson = JSON.parse(columnsJsonString, reviver);
          let params = {}
          for(key in columnsJson) {
            try {
              params[key] = columnsJson[key].call();
            } catch(e) {
              params[key] = null;
            }
          }

          return params;
        }, columnsJsonString)
        res[this.primary] = itemName;
        result.push(res)
      }
    } catch(e) {
      console.log('Oups Something! Check out below message!')
      console.log(e)
    }
    await browser.close()
    return result;
  }

  // INFO: check dom has changed when options.test is true.
  async domChanged() {
    const testPrimaryKeyElement = this.testPrimaryKeyElement;

    // INFO: to avoid loop for fetch method.
    this.test = false;

    if (testPrimaryKeyElement) {
    const json   = await this.fetch(testPrimaryKeyElement);
      const values = Object.values(json);
      if (values.includes(null)) {
        return true;
      }
      else {
        return false;
      }
    } else {
      console.log("Unfortunately, you can't recognize dom has changed becasuse testPrimaryKeyElement is not found.")
      return false;
    }
  }
}
