<?php
include_once 'datacon.php';
$fmode="";
$fformname="";
$ftable="";
$fdatabase="";
$frecordno=-1;
$fupdatexml="";
if (!empty($_POST))
{
	if (isset($_POST["recordno"]))
	$frecordno=$_POST["recordno"];
	if (isset($_POST["fmode"]))
	$fmode=$_POST["fmode"];
	if (isset($_POST["fname"]))
	$fformname=$_POST["fname"];
	
	executeform();
}
function executeform()
{

	global $fmode,$fformname,$frecordno;
	if ( $fformname=="bildirimformu")
	{
		if ($fmode=="create" )
		{
			$qry=new tquery('bildiriform',null);
			$qry->open(true);
		
			$qry->field(0)->displaylabel("ARAÇ SAHİBİ ADI SOYADI");
			$qry->field(1)->mask="(000) 00000000;_";
			echo $qry->createForm("Bildirimform");
			echo <<<END
			Bildirimform.width(600);
			Bildirimform.height(100);
			Bildirimform.caption("ASDQWE");
END;
		}else
		if ($fmode=="read" && $frecordno!=-1)
		{
			$qry=new tquery('bildiriform',null);
			$qry->open(true);
			
			echo $qry->readDataToXML($frecordno,1);
		}
	}
}

?>
