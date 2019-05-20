#!/usr/bin/env node
const path = require('path')

const BaseModelPath = path.join(__dirname, '..', 'lib/BaseModel.js')
const DiglettPath   = path.join(__dirname, '..', 'lib/Diglett.js')
const BaseModel = require(BaseModelPath)
const Diglett  = require(DiglettPath)
const program = require('commander')
const fs = require('fs-extra')

program
  .version('0.0.1')
  .name('digg fetch')
  .option('-S, --sample', 'hoge')
  .parse(process.argv)

  const args      = process.argv
  const nodePath  = args[0]
  const dirPath   = args[1]
  const method    = args[2]
  const parentModelName = args[3]
  const modelName = args[4]
  const itemName  = args[5]
  const itemName1  = args[6]
  const currentPath = process.cwd()

  program
    .version('0.0.1')
    .option('-d, --database', 'save db')
    .option('-j, --json', 'output json')
    .parse(process.argv);

const output = async function(instance, data) {
  if (program.database) {
    await instance.save(data)
  } else if (program.json) {
    await instance.outputJson(data)
  }
}

if (method == 'generate') {
  const templatePath = path.join(__dirname, '..', 'template')
  fs.copySync(templatePath, currentPath);
  return
}

const Klass  = require(`${currentPath}/models/${parentModelName}/${modelName}.js`)

switch(method) {
  case "fetch":
    (async() => {
      instance = new Klass
      await instance.init()
      diglett = new Diglett(instance);
      await diglett.fetch(itemName).then(async(data) =>{ await output(instance, data) });
    })();
    break;
  case "seed":
    (async() => {
      instance = new Klass
      await instance.init()
      diglett = new Diglett(instance)
      await diglett.fetch_seed().then(async(data) =>{ await output(instance, data) })
    })();
    break;
  case "test":
    (async() => {
      instance = new Klass;
      await instance.init()
      const testUser = await instance.findTestPrimaryKeyElement();
      console.log(testUser)
    })();
    break;
  // dugtrio update parentModelName ChildModelName 1 100 -d
  case "update":

    if (!itemName || !itemName1) {
      console.log('lack of arguments!')
      console.log("use like this 'dugtrio update parentModelName ChildModelName 1 100 -d'")
      return;
    }

    (async(itemName) => {
      instance = new Klass;
      await instance.init()
      const primarykeys = await instance.primarykeys();
      const primarykeysLength = primarykeys.length;
      diglett = new Diglett(instance);
      const starNumber = (itemName ? itemName - 1 : 0)
      const endNumber  = (itemName1 ? itemName1 - 1 : 0)
      const targetPrimaryKeys = primarykeys.filter((e, i) => {
        return i >= starNumber && i <= endNumber
      })

      // TODO: the order is wrong..?
      // TODO: connection is still alive when finished

      await diglett.update(targetPrimaryKeys).then(async(data) =>{ await output(instance, data) });
    })();
    break;
}
