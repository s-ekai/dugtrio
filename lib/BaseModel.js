const Knex = require('knex');
const fs = require('fs-extra');

module.exports = class BaseModel {
  constructor() {
    this.columns = {}
    this.options = {}
    this.seed = {}
    this.primary = null
  }

  createKnexClient() {
    const DBConfig = this.DBConfig;
    const conn = {
      host     : DBConfig.host,
      user     : DBConfig.user,
      password : DBConfig.password,
      charset  : DBConfig.charset,
    };
    const dbName = DBConfig.database;
    const knexClient = Knex({ client: 'mysql', connection: conn});
    knexClient.raw(`CREATE DATABASE IF NOT EXISTS ${dbName}`)
      .then(function(){
        knexClient.destroy();
    });
    return Knex({ client: 'mysql', connection: DBConfig});
  }

  async save(data) {

    if (Object.keys(data).length == 0) {
      return;
    }

    if (Array.isArray(data)) {
      const dataLength = data.length;
      const tableName = this.tableName();
      const knexClient = this.createKnexClient();
      const primaryKey = this.primary;
      // TODO: use knex datetime.
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // TODO: created_at and updated_at datatype must be datetime.
      data.forEach(d => {
        d['created_at'] = currentTime;
        d['updated_at'] = currentTime;
      })

      const columns = Object.keys(data[0])
      const columnsList = columns.map((column, i) => (i == columns.length - 1) ? `${column} ` : `${column}, ` ).reduce((a,b)=>a+b)
      const columnsUpdateCommnads = columns.map((column, i) => (i == columns.length - 1) ? `${column} = VALUES(${column})` : `${column} = VALUES(${column}),` ).reduce((a,b)=>a+b)

      // TODO: created_at should not be updated. this is wrong.
      const updateQuery = [
          `INSERT INTO ${tableName} (${columnsList}) VALUES`,
          data.map(() => '(?)').join(','),
          'ON DUPLICATE KEY UPDATE',
      ].concat(columnsUpdateCommnads).join(' ')

      const vals = [];
      data.map(d => {
          vals.push(Object.values(d));
      });
      return knexClient.raw(updateQuery, vals).finally(() => {
        knexClient.destroy();
      });

    } else {
      // INFO: convert anything to string
      Object.keys(data).forEach(key => {
        if (data[key] != null) {
          data[key] = typeof(data[key]) == "string" ? data[key]: String(data[key])
        } else {
          if (this.options.nullFalse) {
            delete data[key];
          }
        }
      })

      const knexClient = this.createKnexClient();
      const tableName = this.tableName();
      const primaryKey = this.primary;

      const record = knexClient(tableName).where(primaryKey, data[primaryKey]).select('id').then(function(record){
        if (record.length != 0) {
          data['updated_at'] = knexClient.fn.now();
          knexClient(tableName).where(primaryKey, data[primaryKey]).update(data).then(function(){
            knexClient.destroy()})
        } else {
          data['created_at'] = knexClient.fn.now();
          data['updated_at'] = knexClient.fn.now();
          knexClient(tableName).insert(data).then(function(){
            knexClient.destroy()})
        }
      })
    }
  }

  async initDB(config) {

    if (config) {
      this.DBConfig = config
    } else {
      this.DBConfig = require('config').db
    }

    if (!this.DBConfig.host) {
      console.log('database config is necessary')
      return
    }

    const tableName = this.tableName();
    const primaryKey = this.primary;
    const columns = Object.keys(this.columns);

    const dbName = this.DBConfig.databse;

    columns.push('created_at')
    columns.push('updated_at')

    const knexClient = this.createKnexClient();

    await knexClient.schema.hasTable(tableName).then(function(exists) {

      if (!exists) {
        console.log('create table')
        return knexClient.schema.createTable(tableName, (table) => {
          table.increments('id');

          // INFO: primary key column datatype is string becase uniq index.
          table.string(primaryKey);
          table.unique(primaryKey);

          columns.forEach(column => {
            table.text(column);
          })
        })
      } else {
        return knexClient(tableName).columnInfo().then(function (existingColumns) {
          const existingColumnsNames = Object.keys(existingColumns);
          const newColumns = columns.filter(column => existingColumnsNames.indexOf(column) === -1)
          return knexClient.schema.table(tableName, table => {
            return newColumns.forEach(column => table.text(column));
          })
        });
      }
    }).catch(e => {
      console.log(e)
    }).finally(() => {
      knexClient.destroy();
    });
  }

  async init(config) {

    // INFO: initialize database.
    await this.initDB(config);

    if (this.options.test && !!!this.options.testPrimaryKeyElement) {
      const testPrimaryKeyElement = await this.findTestPrimaryKeyElement()
      this.options.testPrimaryKeyElement = testPrimaryKeyElement
    }
  }

  async findTestPrimaryKeyElement() {
    const tableName = this.tableName();
    const primaryKey = this.primary;
    const columns   = Object.keys(this.columns)
    columns.push(primaryKey)
    const sqlMainContent = `SELECT ` + columns.map((column, i) => (i == columns.length - 1) ? `${column} ` : `${column}, ` ).reduce((a,b)=>a+b) + `FROM ${tableName} WHERE `
    const sqlConditionContent = sqlMainContent + columns.map((column, i) => (i == columns.length - 1) ? `${column} is not NULL ` : `${column} is not NULL AND ` ).reduce((a,b)=>a+b);

    const knexClient = this.createKnexClient();
    const record = await knexClient.raw(sqlConditionContent).then(function(rows) {
      return rows[0];
    }).finally(() => {
      knexClient.destroy();
    });
    if (record) {
      console.log('success! All DOM path is not changed!');
      return record[0][primaryKey];
    } else {
      console.log('Test User is not exists!');
    }
  }

  async primarykeys() {
    const primaryKey = this.primary;
    const tableName = this.tableName();
    const knexClient = this.createKnexClient();
    return knexClient.column(primaryKey).select().from(tableName).map(column => column[primaryKey]);
  }

  tableName() {
    const className = this.constructor.name.toLowerCase();
    const parentClassName = Object.getPrototypeOf(this.constructor).name.toLowerCase();
    return `${parentClassName}_${className}`;
  }

  async outputJson(data) {
    const dateString = String(Date.now());
    const tableName = this.tableName();
    const filepath = `./data/json/${dateString}_${tableName}.json`;
    fs.writeFile(filepath, JSON.stringify(data), function(err) {
      if (err) throw err;
    });
  }
}
