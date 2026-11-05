import {readdirSync,readFileSync,existsSync} from 'node:fs'
import {join,resolve,relative,extname} from 'node:path'
import {spawnSync} from 'node:child_process'

const root=resolve('.')
const js=join(root,'assets','js')
const files=readdirSync(js).filter(name=>name.endsWith('.js'))
let failures=0
for(const file of files) {
  const path=join(js,file)
  const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'})
  if(result.status!==0){console.error('JS inválido: '+file+'\n'+result.stderr);failures++}
}
const htmls=['index.html','admin/index.html','404.html']
for(const page of htmls){
  const path=join(root,page)
  if(!existsSync(path))continue
  const text=readFileSync(path,'utf8')
  for(const [tag,attr] of [['script','src'],['link','href']]) {
    const re=new RegExp('<'+tag+'\\b[^>]*?\\b'+attr+'\\s*=\\s*["\\\']([^"\\\']+)["\\\']','gi')
    for(const match of text.matchAll(re)){
      const href=match[1].split(/[?#]/,1)[0].trim()
      if(!href||/^(?:https?:|data:|\/\/|mailto:|tel:|#)/i.test(href))continue
      if(tag==='link'&&!['.css','.js','.ico','.webmanifest'].includes(extname(href)))continue
      const file=href.startsWith('/')?resolve(root,'.'+href):resolve(root,page==='index.html'||page==='404.html'?'': 'admin',href)
      if(relative(root,file).startsWith('..')){console.error('Ruta fuera del sitio: '+href);failures++;continue}
      if(!existsSync(file)){console.error('Referencia rota en '+page+': '+href);failures++}
    }
  }
}
if(failures){console.error('AromaLParfum QA FAIL: '+failures+' fallos');process.exitCode=1}
else console.log('AromaLParfum QA OK: '+files.length+' scripts JS + referencias HTML locales de las páginas.')
