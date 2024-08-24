// root
// id, title, choices

// choices
  // id, title, fragment
  // fragment
    // id
    // photo.content
    // progress
    // title
    // actions
      // id
      // photo.content
      // title
      // video.resolved_content

const jsdom = require('jsdom')
const dom = new jsdom.JSDOM("")
const $ = require('jquery')(dom.window)
const fs = require('fs')

const fileReader = fs.readFileSync('./game.xml', 'utf8')
const xmlString = fileReader.toString()
//const result = convert(xmlString)
//fs.writeFileSync('./game.js', result)

function convert(text) {
  // Reads game.xml file
  var xmlDoc = $.parseHTML(text);
  var gamePages = [];

  $(xmlDoc).each(function (i, elem) {
      var page = {};
      page.id = $(this).attr('id');
      page.stype = $(this).attr('stype');
      page.type = $(this).attr('type');
      page.resume = $(this).attr('resume');
      page.wcount = $(this).attr('wcount');
      page.wcounta = $(this).attr('wcounta');
      page.wcountb = $(this).attr('wcountb');
      page.qtext = $(this).attr('qtext');
      page.video = $(this).attr('video');

      for (i = 1; i < page.wcount; i++) {
          page["id" + i] = $(this).attr("id" + i);
          page["photo" + i] = $(this).attr("photo" + i);
          page["ctext" + i] = $(this).attr("ctext" + i);
      }
      for (i = 1; i <= page.wcounta; i++) {
          page["aid" + i] = $(this).attr("aid" + i);
          page["aphoto" + i] = $(this).attr("aphoto" + i);
      }
      for (i = 1; i <= page.wcountb; i++) {
          page["bid" + i] = $(this).attr("bid" + i);
          page["bphoto" + i] = $(this).attr("bphoto" + i);
      }

      gamePages[page.id] = page;
  });
  return gamePages;
}

const parsed = convert(xmlString);
//console.log(parsed)

const gameId = 85500
const fakeURL = (path) => `http://localhost:9999/custom/serve/games/${gameId}/images/${path}`
const findId = (id) => parsed.find(page => page.id === id)

for (let i = 0; i < parsed.length; i++) {
  const page = parsed[i];
  const basePage = {
    id: page.id,
    title: page.qtext,
    resource: {
      resolved_content: fakeURL(page.video)
    },
    choices: [],
    fragments: []
  }
  // choices
  for (let w = 1; w < page.wcount; w++) {
      const choice = {
        id: page["id" + w],
        description: page["ctext" + w],
        photo: fakeURL(page["photo" + w])+".jpg",
      }
      basePage.choices.push(choice)
  }
  // clean choices - if both are identical, remove one
  if (basePage.choices.length === 2) {
    if (basePage.choices[0].id === basePage.choices[1].id) {
      basePage.choices.pop()
    }
  }
  // bid - fragment
  // add on to first fragment
  for (let b = 1; b <= page.wcountb; b++) {
    const bidElem = findId(page["bid" + b])
    const fragment = {
      id: page["bid" + b],
      photo: {
        content: fakeURL(page["bphoto" + b])+".jpg"
      },
      video: {
        resolved_content: fakeURL(bidElem.video)
      },
      actions: []
    }
    // if bid !== curid, fetch actions
    if (page.id !== page["bid" + b]) {
      for (let a = 1; a <= bidElem.wcounta; a++) {
        const action = {
          id: bidElem["aid" + a],
          photo: {
            content: fakeURL(bidElem["aphoto" + a])+".jpg"
          },
          video: {
            resolved_content: fakeURL(findId(bidElem["aid" + a]).video)
          }
        }
        fragment.actions.push(action)
      }
    }
    basePage.fragments.push(fragment)
  }
  // aid - actions
  for (let a = 1; a <= page.wcounta; a++) {
    const action = {
      id: page["aid" + a],
      photo: {
        content: fakeURL(page["aphoto" + a])+".jpg"
      },
      video: {
        resolved_content: fakeURL(findId(page["aid" + a]).video)
      }
    }
    // add to first fragment
    basePage.fragments[0].actions.push(action)
  }
  // clean fragments if dne
  if (basePage.fragments.length === 0) {
    delete basePage.fragments
  }
  
  // write to file
  fs.writeFileSync(`./serve/games/85500/choices/${basePage.id}.json`, JSON.stringify(basePage, null, 2))
}