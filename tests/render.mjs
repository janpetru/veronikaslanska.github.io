import {Liquid} from 'liquidjs'; import * as yaml from 'js-yaml'; import fs from 'fs'; import {marked} from 'marked';
import path from 'path'; import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const src=path.resolve(here,'..'), out=path.join(here,'_nahled');
const cfg=yaml.load(fs.readFileSync(src+'/_config.yml','utf8'));
const web=yaml.load(fs.readFileSync(src+'/_data/web.yml','utf8'));
const e=new Liquid({root:src+'/_includes',extname:'',jekyllInclude:true,dynamicPartials:false});
e.registerFilter('markdownify',s=>marked.parse(s||''));
e.registerFilter('slugify',s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
let tpl=fs.readFileSync(src+'/index.html','utf8').replace(/^---[\s\S]*?---\n/,'');
const html=await e.parseAndRender(tpl,{site:{...cfg,time:new Date(),data:{web}}});
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(out+'/index.html',html);
fs.cpSync(src+'/style.css',out+'/style.css'); fs.cpSync(src+'/images',out+'/images',{recursive:true});
export default async () => {}; // pro globalSetup v Playwrightu
