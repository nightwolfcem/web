<?php 
include "datacon.php";
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<?php 
$wrong=-1;
if (isset($_GET["wrongid"])&& $_GET["wrongid"]=="true")
{
	echo "c";
	$wrong=1;
}

if (isset($_POST["user_id"]))
{
	$qry=new tquery("kullanıcılar","ilkinsaat");
	$qry->_query="Select * From kullanıcılar Where ((`Kullanıcı Adı`='{$_POST["user_id"]}' or `Email`='{$_POST["user_id"]}') and `Şifre`='{$_POST["password"]}')";
	
	if ($qry->open(true))
	{
		if ($qry->recordcount()>0)
		{
			$qry->recordno(0);
			$userid=$qry->field("İd",true)->_value;
			session_id($userid);
			session_save_path("sessions");
			session_cache_limiter("Public");
			if (session_start())
			{
				header("location:aracbildirimformu.php");
				$_SESSION["username"]=$_POST["user_id"];
				$_SESSION["password"]=$_POST["password"];
				
			}
			
		}else
			header("location:giris.php?wrongid=true");
	}
	
	
}

?>
<html>
<head>
<script src="../../files/js/ortak/dom.js" type="text/javascript"></script>
<script type="text/javascript">
var ajax=new Tajax();
function girisonay()
{
	document.forms['uyegiris'].action='giris.php';
	document.forms['uyegiris'].submit();

}

</script>
<?php 


?>
</head>

<Body Style="">
<div style="vertical-align:%50; width:400px;height:150px;padding:10px;margin:auto;margin-top:200px;border:groove 8px; border-radius:80px 20px;background-color: #ccffff">
<div style="margin:5px 50px">
<form   id="uyegiris" name="uyegiris" method="POST" onsubmit="javascript:girisonay()">
<table>
<tr>
<td>
Kullanıcı İsmi
</td>
<td>
<input id="user_id" name="user_id" type="text" value="" />
</td>
</tr>
<tr>
<td>
Şifre
</td>
<td>
<input id="password" name="password" type="password" value="" />
</td>
</tr>

<tr>
<td>
Beni hatırla
</td>
<td>
<input id="ex_limit" name="ex_limit" type="checkbox" value="" />
</td>
</tr>
<tr>
<td>

</td>
<td>
<input type="submit" style="float:right" value="Giriş Yap" onclick="javascript:gonder()"/>
</td>
</tr>
</table>
</form>
<?php 
if ($wrong==1)
{
	echo "Lütfen kullanıcı adınızı ve şifrenizi kontrol edip tekrar deneyiniz.";
}
?>
</div>
</div>
</Body>
