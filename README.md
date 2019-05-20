# Dugtrio

Dugtrio is Object Oriented Web Scraping.

Dugtrio uses
- [Puppeteer](https://github.com/GoogleChrome/puppeteer) for scraping,
- [Knex](https://github.com/tgriesser/knex) as SQL Query Builder.(default RDBMS is MySQL)


# Installation

```
npm install dugtrio
```

# Basic Usage

Define scraping target page detail:
```javascript
const Dugtrio = require("dugtrio");
const BaseModel = Dugtrio.BaseModel;

class TwitterUser extends BaseModel {
  constructor() {
    super();
    this.url = 'https://twitter.com/(:username)?lang=ja',
    this.primary = "username"
    this.columns = {
      'followersCount': function() { return Array.from(document.getElementsByTagName('a')).filter(e => e.dataset['nav'] === 'followers')[0].getElementsByClassName('ProfileNav-value')[0].innerText.replace(',', ''); },
      'followingsCount': function() { return Array.from(document.getElementsByTagName('a')).filter(e => e.dataset['nav'] === 'following')[0].getElementsByClassName('ProfileNav-value')[0].innerText.replace(',', ''); },
    }
  }
}

const Diglett = Dugtrio.Diglett;
const username = 'Masayukiii';
(async(username) => {
  instance = new TwitterUser
  diglett = new Diglett(instance);
  await diglett.fetch(username).then(async(data) =>{ console.log(data) });
})(username);

```


## Advanced Usage

### generate template
I Strongrly recommend use this template,
it supports variaus option.
```
npm run dugtrio generate
```

### how to save data

update database(MySQL) config on config/default.js.
```
{
  "db":{
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "charset": "utf8",
    "database": "Dugtrio
  }
}
```

after fetching, you can save them.
(Default data type is JSON.)
```
(async(username) => {
  instance = new TwitterUser
  diglett = new Diglett(instance);
  await diglett.fetch(username).then(async(data) =>{ await instance.save(data) });
})(username);
```


### how to collect a lot of data all at once.

dugtrio supports to get seed data.
(You know user list is oftern separate. So you have to get them to access page like user profile.)



# BestPractice

I will introduce best practice code using dugtrio.

## Option
next time

# How to use CLI
suprisingly, dugtorio supports cli.
so you can scrap on your terminal.

## default useage example

### Option
with -d, save data
with -j, output to data/json/


# caution

## about time sleep
default time sleep is about 5s.
This behaviour is not like human.
if you want to change it. you can edit Diglett code.

WARNING: you have to remember that Scraping so many times in short term is evil, I dont have any responsiblities about this.

## about login
if you want to login fetch more detail info, be careful to use fetch method many times because
many login and logout action in short time is so strange.

## about database
dugrorio creates database, and table, columns by your definition automatically If you use BaseModel init method.
And data type of primary key is string (with index), the others's data type is text.
I guess you think it is bad, I agree you opinion. But it is so tired to define data type of each elements and
scraping contens is text base.
