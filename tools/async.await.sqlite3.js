// from https://gist.github.com/etienne-martin/fc6751b2d7e3e87386ac56bb80a44afb
//import * as sq3 from "sqlite3";
const sq3 = require("sqlite3")

const Database = (filename = "") =>
  new Promise((resolve) => {
    const db = new (sq3.verbose()).Database(filename, (err) => {
      if (err) throw err;
      resolve(wrapDb(db));
    });
  });

const createRunFunc = db =>
  (sql, ...params) =>
    new Promise((resolve) => {
      db.run(sql, ...params, (err) => {
        if (err) throw err;
        resolve(wrapDb(db));
      });
    });

const createFunc = (db, method) =>
  (sql, ...params) => 
    new Promise((resolve) => {
      db[method](sql, ...params, (err, result) => {
        if (err) throw err;
        resolve(result);
      });
    });

const wrapDb = db => ({
  run: createRunFunc(db),
  get: createFunc(db, 'get'),
  all: createFunc(db, 'all'),
  close: () => db.close()
});

module.exports = {
  Database
};