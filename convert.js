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
const crypto = require("crypto")

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

const gameId = 85500
const mapped = []
const fakeURL = (path) => `http://localhost:9999/custom/serve/games/${gameId}/images/${path}`
const findParsed = (id) => parsed.find(page => page.id === id)
const randomActionID = () => "aid"+crypto.randomBytes(4).toString("hex")

const mapAction = (bidElem, i) => ({
  id: randomActionID(),
  photo: {
    content: fakeURL(bidElem["aphoto" + i])+".jpg"
  },
  video: {
    resolved_content: fakeURL(findParsed(bidElem["aid" + i]).video)
  }
})

const mapChoice = (page, i) => ({
  id: page["id" + i],
  description: page["ctext" + i],
  photo: fakeURL(page["photo" + i])+".jpg",
})

for (let i = 0; i < parsed.length; i++) {
  const page = parsed[i];
  const basePage = {
    id: page.id,
    type: page.type,
    title: page.qtext,
    resource: {
      resolved_content: fakeURL(page.video)
    },
    choices: [],
    fragments: []
  }
  // choices
  for (let w = 1; w < page.wcount; w++) {
    basePage.choices.push(mapChoice(page, w))
  }
  // clean choices - if both are identical, remove one
  if (basePage.choices.length === 2) {
    if (basePage.choices[0].id === basePage.choices[1].id) {
      basePage.choices.pop()
    }
  }
  // bid - fragment
  for (let b = 1; b <= page.wcountb; b++) {
    const fragid = page["bid" + b]
    const bidElem = findParsed(fragid)
    const fragment = {
      id: fragid,
      photo: {
        content: fakeURL(page["bphoto" + b])+".jpg"
      },
      video: {
        resolved_content: fakeURL(bidElem.video)
      },
      actions: []
    }
    // fetch actions
    for (let a = 1; a <= bidElem.wcounta; a++) {
      fragment.actions.push(mapAction(bidElem, a))
    }
    basePage.fragments.push(fragment)
  }

  // clean fragments if dne
  if (basePage.fragments.length === 0) {
    delete basePage.fragments
  } else { // if has fragments, set resource id to be empty
    delete basePage.resource.resolved_content
  }
  
  // add to mapped
  mapped.push(basePage)
}

const findMapped = (id) => mapped.find(page => page.id === id)

// cleanup run
for (const basePage of mapped) {
  // choice cleanup
  // while id is included in fragment id, override with the last one
  curPage = basePage
  while ((curPage.fragments || []).some(frag => frag.id === curPage.id) && curPage.choices.length == 1 && curPage.choices[0].id !== curPage.id) {
    // folow the id of last frag
    const nextIdx = curPage.choices[0].id
    curPage = findMapped(nextIdx)
  }
  // if last page is not the same as the current page, override choices
  if (curPage.id !== basePage.id) {
    basePage.choices = curPage.choices
  }
  // end cleanup loop
  fs.writeFileSync(`./serve/games/85500/choices/${basePage.id}.json`, JSON.stringify(basePage, null, 2))
}