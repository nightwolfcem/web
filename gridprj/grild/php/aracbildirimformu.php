<?php 
include_once 'forms.php';
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

<?php 
		
		
		$fmode="create"; 
		$fformname="bildirimformu";
		executeform();
		?>
		
</script>
<body>
<?php 
session_start();
echo var_dump($_SESSION);
?>
<script type="text/javascript">

Bildirimform.body();

</script>

</body>
</head>

</html>
