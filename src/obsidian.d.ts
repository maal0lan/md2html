declare module 'obsidian' {
 export class TFile { path:string; name:string; basename:string; extension:string; parent:TFolder|null; stat:{mtime:number;size:number}; }
 export class TFolder { path:string; name:string; children:any[]; }
 export class Notice { constructor(message:string); }
 export class Plugin { app:any; loadData():Promise<any>; saveData(data:any):Promise<void>; addCommand(x:any):void; addSettingTab(x:any):void; }
 export class PluginSettingTab { app:any; containerEl:any; constructor(app:any,plugin:any); }
 export class Setting { constructor(el:any); setName(x:string):this; setDesc(x:string):this; addDropdown(cb:(x:any)=>void):this; addText(cb:(x:any)=>void):this; }
 export function normalizePath(path:string):string;
 export function arrayBufferToBase64(data:ArrayBuffer):string;
 export interface App { vault:any; metadataCache:any; workspace:any; }
}
