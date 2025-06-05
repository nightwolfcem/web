DOM.head.addStyleSheet(globs.path + "files/css/menu.css");
(() => {
	if(!globs)
	{
	let k=document.getElementsByTagName("head")[0].getElementsByTagName("script");
	for (let i=0;i<k.length;i++)
	{
		if(k.src=="../files/js/global/dom.js") return;
	}
	let link= document.createElement( "script" );
	link.src = path;
	DOM.head.appendChild(link);

	}
	})();


var menuCount = 0;
var menuZIndex=windowZIndex+1000;
var menus=new Array();
HTMLElement.prototype.bind.call(document,"mousedown", function(e) {
	var prnt,t=false;
	
	for(var i=0;i<menus.length;i++)
	{
		t=false;
		prnt=e.target;
		while(prnt)
	{
		
		if(prnt==menus[i].htmlObject)
		{
			t=true;
			break ;
		}
		if(prnt.parentNode)
			prnt=prnt.parentNode;
		else break;
	}	
	if(!t)
	{
		menus[i].hide();
		
	}}
}.toEventFunc(null));

class Tmenu extends TabsoluteElement{
	#contextMenu
	constructor(id, owner) {
		super( "TABLE", id);
		menus.push(this);
		this.table = document.createElement("TABLE");
		this.owner = owner || null;
		//this.width = 200;
		//this.textalign = Ealign.left;
		this.htmlObject.appendChild(this.table);
		this.table.cellPadding = 0;
		this.table.cellSpacing = 0;
		this.table.style.emptyCells = "hide";
		this.align=Ealign.right+Ealign.top+Ealign.bottom;
		this.items = new Array();
		this.defineProp("contextMenu", {get:()=>this.#contextMenu,set:(v)=>{this.#contextMenu=v;if(v)this.update()}});
		menuCount++;
		this.htmlObject.style.zIndex =menuZIndex+ menuCount;
		this.htmlObject.style.display="";
		// this.menuType="context menu";//sub menu

		// this.width(400);
		this.glassEfect = true;
		this.color = "#d5d5db";
		this.sideBar = {
			visible: true,
			color: "",
			width: 25,
			imageSize: 0
		};
	}

	addItem(caption) {

		var r = new TMenuItem(this);
		r.caption=caption;
		this.items.push(r);
		this.update();
		return r;
	}

	update() {
		if (this.contextMenu)
			document.oncontextmenu = function(e) {		
				this.popup(e.clientX + document.body.scrollLeft, e.clientY + document.body.scrollTop,e.target);
				return false;
			}.bind(this);

		this.htmlObject.style.width = this.width + "px";
		this.htmlObject.style.backgroundColor = this.color;
		for (var i = 0; i < this.items.length; i++) {
			this.items[i].update();
			if (this.texEalign != Ealign.left) {
				this.items[i]._txt.parentNode.style.texEalign = Ealign.center ? "center" : "right";
			}
		}
	}

	hide() {
		this.htmlObject.style.opacity=0;
		this.htmlObject.style.pointerEvents="none";
		/*for ( var i = 0; i < this.items.length; i++) {
			if (this.items[i].subMenu
					&& this.items[i].subMenu.htmlObject.display != "none")
				this.items[i].subMenu.hide();
		}*/
	}

	popup(x, y,t) {
		if (typeof x == "Object") {
			var s = this.htmlObject.alignToObjectRect(x, Ealign.bottom + Ealign.left);
		} else {
			this.htmlObject.style.left = x + "px";
			this.htmlObject.style.top = y + "px";
		}
		
		this.htmlObject.style.opacity=1;
		this.htmlObject.style.pointerEvents="auto";
		if (this.onpopup)
			this.onpopup.call(this,t?t:x);
		
	}

	body(owner) {
		super.body(owner);
	}

	width(v) {
		if (v != null) {
			this.table.style.width = v + "px";
		} else
			return this.table.style.offsetWidth;
	}
}

/**
 * Bir men� ��esi tan�mlar
 * 
 * @param id
 *            men� ��esinin idsi
 */
/*
 * &#9654;//sola ok &#9679;//daire &#9660;//a�a�� ok
 */
class TMenuItem {
	#submenu;
	constructor(menu) {
		this.menu = menu;
		var c, r = menu.table.insertRow(menu.table.rows.length);
		r.onmousedown = this.onmdown.toEventFunc(this);
		r.onmouseout = this.onmout.toEventFunc(this);
		r.onmouseover = this.onmover.toEventFunc(this);
		// this.tb.style.emptyCells="hide";
		if (menu.sideBar.visible) {
			c = r.insertCell(r.cells.length);
			c.style.cssText="text-align:center;vertical-align:top;border-right:groove 4px";
			// c.style.width = menu.sideBar.width;
			c.style.backgroundColor = menu.sideBar.color;
			c.rowSpan = 2;
			this._icon = document.createElement("SPAN");
			this._icon.style.display = "none";
			this._icon.style.paddingRight = "3px";
			this.onclick = null;

			c.appendChild(this._icon);
			this._img = document.createElement("IMG");
			this._img.style.display = "none";
			this._img.style.paddingTop = "2px";
			this._img.style.verticalAlign = "middle";
			c.appendChild(this._img);
			// c.style.display="none";
			if (menu.sideBar.imageSize > 0) {
				this._img.style.width = menu.sideBar.imageSize + "px";
				this._img.style.height = menu.sideBar.imageSize + "px";
			}
		}
		c = r.insertCell(r.cells.length);
		c.width = "100%";
		this._txt = document.createElement("SPAN");

		this.captionSize = "";
		this.captionColor = "#000";
		this.captionShadowColor = "#000";
		c.appendChild(this._txt);
		// this.td.appendChild(this.tb);
		this._subicon = document.createElement("SPAN");
		this._subicon.style.cssFloat = "right";
		this._subicon.style.float = "right";
		this._subicon.style.paddingRight = "4px";
		this._subicon.innerHTML = "&#9654";
		this._subicon.style.display = "none";
		c.appendChild(this._subicon);
		this._ctx = document.createElement("DIV");
		this._ctx.style.display = "none";
		r = menu.table.insertRow(menu.table.rows.length);

		c = r.insertCell(0);
		c.appendChild(this._ctx);
		this._enable = true;
		this.defineProp("subMenu",{get:()=>this.#submenu,set:(v)=>{this.#submenu=v;this._subicon.style.display =v?"":"none"}});
		this.image = "";
		this.context = "";
		this.groupIndex = -1;
		this.checkAble = false;
		this._checked = false;
		this._loaded = false;
	}

	update() {
		if (this.captionSize)
			this._txt.style.fontSize = this.captionSize + "px";
		this._txt.innerHTML = this.caption;

		this._txt.style.color = this.captionColor;
		this._txt.style.captionShadow = this.captionShadowColor
			+ " 3px 3px 3px";
		this._img.src = this.image;
		if (this.context != "")
			this._ctx.innerHTML = this.context;

		if (this._ctx.innerHTML != "")
			this._ctx.style.display = "";
		if (this.groupIndex != -1)
			this._icon.innerHTML = "&#9679;";
		else if (this.checkAble)
			this._icon.innerHTML = "&#x2713;";
	}

	enable(v) {
		if (v != null) {
			if (v != this._enable) {
				// if(this.)
				this._enable = v;
				this._txt.style.color = v ? this._captionColor : "#aaa";
				this._txt.style.captionShadow = !v ? "#fff 3px 3px 0px"
					: (this.captionShadowColor ? " 3px 3px 3px" : "");
			}
		} else
			return this._enable;
	}
	checked(v) {
		if (v != null) {
			if (v != this._checked) {
				this._checked = v;
				this._icon.style.display = v ? "" : "none";
				if (v && this.groupIndex > -1) {
					this._icon.style.display = "";

					for ( var i = 0; i < this.menu.items.length; i++) {
						if (this.menu.items[i].groupIndex == this.groupIndex)
							if (this.menu.items[i] != this
									&& this.menu.items[i]._icon.style.display == "") {
								this.menu.items[i]._icon.style.display = "none";
								this.menu.items[i]._checked = false;
							}
					}
				}

			}
		} else
			return this._checked;
	}
	onmdown(e) {
		if (this._enable) {
			if (e.button == 1) {
				if (this.checkAble)
					this.checked(!this.checked());
				else if (this.groupIndex != -1 && !this._checked)
					this.checked(true);

			}
			if (this.onclick)
				this.onclick.call(this);
				if (this.menu.onclick)
				this.menu.onclick.call(this);
			this.menu.hide();
			return false;
		}
	}
	onmover (e) {
		if (this.menu._mold && this.menu._mold.subMenu) {
			this.menu._mold.subMenu.htmlObject.style.opacity = 0;
			this.menu._mold.subMenu.htmlObject.style.pointerEvents="none";
		}
		if (this.subMenu && this.subMenu.popup) {
			this.subMenu.caller=this;
			if(this.subMenu.onshow)
				this.subMenu.onshow.call(this);
			this.subMenu.htmlObject.alignToObjectRect(this._subicon,this.subMenu.align,false,true);
			this.subMenu.htmlObject.style.width = this.subMenu.width + "px";
			this.subMenu.htmlObject.style.opacity=1;
			this.subMenu.htmlObject.style.pointerEvents="auto";
		}
		var s = this._txt.parentNode.style;

		this.menu._mold = this;
		//if(this.menu.glassEfect)
		//s.background = "url(../files/images/global/gradientbutton.png)";
		//s.backgroundPosition = "25px";
		//s.border = "solid rgb(125,125,255) 1px";

	}
	onmout (e) {
		if (this.subMenu)
		{	this.subMenu.style.opacity=0;
			this.subMenu.style.pointerEvents="none";}
		var s = this._txt.parentNode.style;
		//s.backgroundImage = "";
		//s.border = "none";

	}
}						
DOM.head.innerHTML=DOM.head.innerHTML+" #TCMitem{.border:none;padding:0;margin:0}";

class TCMItem extends TdragDropElement{
	constructor(menu) {
		super("DIV");
		this.table = document.createElement("TABLE");
		this.table.className = "TCMitem";
		this.items = new Array();
		this.menu = menu;
	}

	addItem(HtmlObj, label) {
		var r = this.table.insertRow(this.table.rows.length - 1);
		var c1, c = r.insertCell(0);
		c1 = null;
		c.appendChild(HtmlObj);
		if (label)
			c1 = r.insertCell(0);
		if (c1 != null) {
			c1.innerHTML = label;
		} else
			c.columnSpan = 2;
	}
}

class TColumnMenu extends Telement{
	constructor(id) {
		super("Table");
		var r = this.htmlObject.rows.insertRow(0);
		r.className = "d3d";
		r.style.cssText = "";
		this.htmlObject.rows.insertRow(1);
		this.htmlObject.style.cssText = "float:right;width:200px;border:2px groove;";
		this._width = 200;
		this.columns = new Array();
	}
}







