<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<script type="text/javascript">



 
	/*$grid=new tquery("anagrup", isset($_POST["database"])?$_POST["database"]:null);
	echo $grid->readDataToXML($_POST["from"],$_POST["to"],$_POST["sfield"],$_POST["smode"]);
*/

</script>
</head>
<body>
<?php

 class tgrd
 {
 	public $func;
 	
 	public function __construct()
 	{
 		
 	}
 	public function grp()
 	 
 	{
 	
 		$this->func($this);
 	}
 	function __call($met,$arg)
 	{
 		
 		if($met=="func" )
 		{
 			echo var_dump($arg);
 			return call_user_func_array($this->{$met},$arg);
 		}
 	}
 	
 	
 	public $name="Ali";
 };

$s = new tgrd();



$s->grp();

 ?>
 
</body>
