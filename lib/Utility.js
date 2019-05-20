module.exports = class Utility{
  // To escape function string, i used toString()...
  // I must find another way... it is dirty.
  static replacer(k, v) {
    return (typeof v === 'function') ? v.toString() : v;
  }

  static reviver(k, v) {
    return (typeof v === 'string' && v.match(/^function/)) ? Function.call(this, 'return ' + v)() : v;
  }

  static toJson(value) {
    return JSON.stringify(value, replacer);
    function replacer(k, v) {
      return (typeof v === 'function') ? v.toString() : v;
    }
  }

  static outputJsonFile(value, filepath) {
    fs.writeFile (filepath, JSON.stringify(data), function(err) {
      if (err) throw err;
    });
  }

  // INFO: for puppeteer debug console
  static debugConsole(page) {
    page.on('console', (log) => console[log._type](log._text));
  }

  static uniqArray(array) {
    return array.filter(function(x, i, self) {
      return self.indexOf(x) === i;
    })
  }
}
