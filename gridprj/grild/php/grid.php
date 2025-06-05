<?php
include_once 'datacon.php' ;



if (isset($_POST["updatexml"])&&isset($_POST["table"]))
{
	$grid=new tquery($_POST["table"],isset($_POST["database"])?$_POST["database"]:null);
	echo $grid->updateFromXML($_POST["updatexml"]);
}else
if (isset($_POST["table"])&&(isset($_POST["from"])))
{
 
 
	$grid=new tquery( $_POST["table"],isset($_POST["database"])?$_POST["database"]:null);
	echo $grid->readDataToXML($_POST["from"],$_POST["to"],isset($_POST["sfield"])?$_POST["sfield"]:null,isset($_POST["smode"])?$_POST["smode"]:null);
	
	
}else 
if (isset($_POST["table"]))
{
	$grid=new tquery($_POST["table"],isset($_POST["database"])?$_POST["database"]:null);
	echo $grid->tableToXML();
}else

if (isset($_POST["databs"]))
{
    if( substr($_SERVER['HTTP_HOST'],0,9)=="localhost")
	{
		$dbs=querydatabasenames($baglanti);
		echo implode(";",$dbs);
	}else
	echo "b4_3164158_akademikdb";
}else
if (isset($_POST["tablenames"]))
{//http://localhost/cem/gridprj/grid/php/grid.php?ttable=COLLATIONS&tfield=CHARACTER_SET_NAME&vfield=ID
	$tbs=querytablenames($_POST["tablenames"]);
	echo implode(";",$tbs);
}
//http://localhost/cem/gridprj/grid/php/grid.php?ttable=COLLATIONS&tfield=CHARACTER_SET_NAME&vfield=ID
if (isset($_GET["ttable"])&&isset($_GET["tfield"]))
{
	$query=new tquery($_GET["ttable"],isset($_GET["database"])?$_GET["database"]:null);
	$qry="";

	$qry="Select `".$_GET["tfield"]."`";
	if (isset($_GET["vfield"]))
	{
		$qry.=",`".$_GET["vfield"]."`";
	}
	$qry.=" FROM `".$_GET["ttable"]."`";
	$query->query($qry);
	echo $query->readDataToXML();
}












