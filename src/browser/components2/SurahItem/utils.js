import style from "./Marks.css"

const md = new MarkdownIt()

const mark = style['mark']
const genuine = style['genuine']
const counterfeit = style['counterfeit']

const renderBody = (surah) => {
    let html = md.render(surah.result.body.text)
    for (const ayah of surah.result.ayat) {
        if (ayah.isGenuine) {
            html = html.replace(new RegExp(`~${ayah.pid}`, 'g'), `<a href="#/${ayah.pid}" class="${mark} ${genuine}">$&</a>`)
        } else {
            html = html.replace(new RegExp(`~${ayah.pid}`, 'g'), `<a href="#/${ayah.pid}" class="${mark} ${counterfeit}">$&</a>`)
        }
    }
    return html
}

export {
    renderBody
}
