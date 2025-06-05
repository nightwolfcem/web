let par=(event)=> { 
  
  function isStartMulti(symbol) {
    return symbol === "${" || symbol === "/*" || symbol === "//";
  }
  function isMulti(symbol) {
    return multiCharSymbols.includes(symbol);
  }

  let value=editor.textarea.value;

    let n,j = 0;
    let text=event.data;
    let allsymbols=["{","(",")","}","[","]","/","*","","'",'"',"\n","$"];
    let textsymbols=["/","*","","'",'"'];
    let leftopenStack =[];
    let rightopenStack =[];
    let openStack = [];
    let start=editor.selection.selectionStart;
    let end=editor.selection.selectionEnd;
  
    if (end<start){
      [start, end] = [end, start];
      }
      if(start==end) 
      {
        start-=event.inputType=="deleteContentBackward"?1:0;
        end+=event.inputType=="deleteContentForward"?1:0;
      }
    let delta=end- start;
    let vs=value.charAt(start);
    delta=text!=null?text.length-delta:-delta;
    let leftSymbols=[];
    let rightSymbols=[];
    let leftGroups=[];
    let rightGroups=[];
    let openLeftGroups=[];
    let OpenRightGroups=[];
    let sl;
    let t;
    let lc=null,rc=null;
   
      for(let i=0;i<symbols.length;i++) {
        let g=symbols[i];
        let sp=g.pos;
        let ism=isMulti(g.type);
      let ep=ism?sp+1:sp;
      if(sp>=end)
        {
            g.pos+=delta;
            rightSymbols.push(g);
        }
        else 
    if(ep<start)
    {
      leftSymbols.push(g);
    }else
    {    if(ism)
          { 
            if(ep==start && singleCharSymbols.includes(g.type[0]))
            { g.type=g.type[0];
              leftSymbols.push(g);
              lc=g;
              } 
            else
            if(sp+1==end && singleCharSymbols.includes(g.type[1]))
            { g.type=g.type[1];
              rightSymbols.unshift(g);
             rc=g;
            } 
          }
    }
  }
  for(let i=0;i<groups.length;i++) {
    let g=groups[i];
    let sp=g.start;
    let ep=g.end;
    let ism=isMulti(g.type);
    let sp1=ism?sp+1:sp;
    let ep1=ism?ep-1:ep;
  if(sp>=end)
    {
        g.pos+=delta;
        rightGroups.push(g);
    }
    else 
if(ep<start)
{
  leftGroups.push(g);
}else
{    
        if(sp1<start){
           if(singleCharSymbols.includes(g.type[0]))g.type=g.type[0];
           openLeftGroups.push(g);
          } 
        else
        if(ep1>=end){
          if(singleCharSymbols.includes(g.type[1]))g.type=g.type[1];
          OpenRightGroups.push(g);
        } 
      }
}


let addSymbols=[];
let addGroups=[];
if(event.inputType=="insertLineBreak")text="\n"
if (text!=null )
{  
//  text=lc+text+rc;
function checkChar(index)
{
  let vl=value[index];
  let ml,s;
  if (index>0)
   ml=false;
 if(index-1>=0)
 {
    if(index==1 || (index-1>0 && value[index-2]!="\\"))
    {
      vl=value[index-1]+vl;
        
        if(isMulti(vl))
        {
          if(leftSymbols.length>0)
         { s=leftSymbols[leftSymbols.length-1] ;
                if(s.pos==index-1 && s.type.length==1)
                  leftSymbols.splice(leftSymbols.length-1,1); 
                lc=null;
          }
          addSymbols.push({pos:index-1,type:vl});
          ml=true;
        } 
    }
  }
      if(index+1<=value.length-1)
        {
          vl=vl+value[index+1];
              if(isMulti(vl))
              { 
                if(rightSymbols.length>0)
                { s=rightSymbols[0] ;
                if(s.pos==index+1 && s.type.length==1)
                 rightSymbols.splice(0,1); 
              }
                addSymbols.push({pos:index,type:vl});
                ml=true;
                index=index+1;
                rc=null;
              }
        }
        if(!ml && singleCharSymbols.includes(value[index]))
         addSymbols.push({pos:index,type:value[index]});
        return index;
  }

  while (j < text.length) {
        let c = text[j];
        if(allsymbols.includes(c))
        {
          j=checkChar(start+j)-start;
        }
        j++;
      }
    }
    else
      if(rc!=null && lc!=null)
      {
        if(isMulti(lc.type+rc.type))
       {addSymbols.push({pos:lc.pos,type:lc.type+rc.type});
        rightSymbols.splice(0,1);
        leftSymbols.splice(leftSymbols.length-1,1);
      } 
    }
   
      symbols=[...leftSymbols,...addSymbols,...rightSymbols];
      let parseSymbols=() => {
        // Açılış -> Kapanış eşleşmeleri
        const openToClose = { 
          "/*":"*/","//":"\n","${":"}","`":"`","'":"'","\"":"\"",
          "(":")","{":"}","[":"]","<":">","/":"/","*":"*","\\":"\\","-":"-"
        };
        // Kapanış -> Açılış eşleşmeleri (automatik ters çevir)
        const closeToOpen = Object.fromEntries(
          Object.entries(openToClose).map(([o,c]) => [c, o])
        );
      
        const groups = [];       // Ana seviye gruplar veya semboller
        const stack = [];        // İç içe grupları takip için stack
      
        for (let s of symbols) {
          const isOpen  = openToClose[s.type];  // Açılış sembolü mü?
          const isClose = closeToOpen[s.type];  // Kapanış sembolü mü?
          
          if (isClose && stack.length) {
            // KAPANIŞ SEMBOLÜ: stack’in tepesindeki grupla eşleşmeli
            let top = stack[stack.length - 1];
            if (top.type === closeToOpen[s.type]) {
              top.endPos = s.pos;  // kapanış konumunu kaydet
              stack.pop();         // grup tamamlandı
            } else {
              if(s.type=="\n")
               top.canFold=true;
            }
          
            continue;
          } 
          if (isOpen) {
            // AÇILIŞ SEMBOLÜ: yeni bir group oluştur
            let group = {
              type: s.type,
              startPos: s.pos,
              endPos: null,
              canFold: false,
              toogle: false,
              subs: [] // alt gruplar veya semboller
            };
            // Stack boş değilse, üstteki grubun altına ekle
            // Yoksa doğrudan en üst seviyeye (`groups`)
            stack.length ? stack[stack.length - 1].subs.push(group) : groups.push(group);
            // Şu an açılan grup stack’in en üstüne yerleşir
            stack.push(group);
          } 
        }
        return groups;
      }
      
     
      groups=parseSymbols();
      console.log(symbols);
      console.log(groups);
    }