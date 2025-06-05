<?php
include_once 'datacon.php';
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<META http-equiv=content-type content=text/html;charset=iso-8859-9>
<META http-equiv=content-type content=text/html;charset=windows-1254>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<script src="../../files/js/ortak/jquery.js" type="text/javascript"></script>
<script src="../../files/js/ortak/dom.js" type="text/javascript"></script>
<script src="../../files/js/ortak/datetime.js" type="text/javascript"></script>
<script src="../../files/js/ortak/calender.js" type="text/javascript"></script>
<script src="../../files/js/ortak/editcontrol.js" type="text/javascript"></script>
<script src="../../files/js/ortak/dtform.js" type="text/javascript"></script>




<script type="text/javascript">

/*var maint=document.createElement("table");
maint.cellPadding=0;
maint.s={x:{s:"cem"}};
m={style:{display:""}};
alert(maint.compare(m));
maint
	.Spacing = "0px"
	.Padding = "0px"
	.border = "2px"
	.tableLayout = "fixed";*/


	
var a={x:5,z:34};
var b={NOTz:34};
alert(a.compare(b));
var dragobj= new TDragDropElement("INPUT");
dragobj.dragMode=dm_copy;
dragobj.obj.type="TEXT";
dragobj.obj.value="cem";

dragobj.dragAble=true;
var dropobj= new TDragDropElement("Table");
var dropob = jQuery.extend(true, {}, dropobj);
var x;

x=dragobj.copy();
x.obj.type="checkbox";
window.onstopdrag=function(obj)
{
	if (mouse.dragTarget==x.obj)
	{
		obj.$parent.dragMode=dm_transfer;
	}	
	return true;
}
dropobj.obj.innerHTML="XZCASD";
dropob.dockAble="cem";
dropobj.dockAble=true;
dropobj.obj.style.cssText="position:relative;background-Color:#ffcc00;";
dropobj.obj.innerHTML='<tr><td ></td><td ></td><td ></td></tr><tr><td ></td><td ></td><td ></td></tr>';

var s={c:"cem"};
function cem(k){

};
cem(s.c);

		
</script>
</head>
<body>
<div id="div1" style="display:relative;left: 200px;top:200px;width:400px;height:400px;background-color: red">
<div style="display:relative;left: 200px;top:100px;width:200px;height:200px;background-color: blue">

</div>
</div>
<script>




</script>
</body>


</html>
