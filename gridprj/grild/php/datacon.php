<?php
header('Content-type: text/html; charset=utf-8');
$yuklendi=true;
$db;
 $baglanti;

if( substr($_SERVER['HTTP_HOST'],0,9)=="localhost")
{
    $baglanti=mysqli_connect ( $_SERVER['HTTP_HOST'],"root" );
	
	$db=mysqli_select_db($baglanti,"ilkconstruction");
}
else
{
	$baglanti=mysqli_connect("sql300.byethost4.com","b4_3164158","12345678");
	$db=mysqli_select_db("b4_3164158_akademikdb");
}
$mainpath="../../";

mysqli_query($baglanti,"SET NAMES 'utf8'");
mysqli_query($baglanti,"SET collation_connection = 'utf8_turkish_ci'");
class Ealign
{
	const none=0;
	const left=2;
	const right=4;
	const center=8;
	const top=16;
	const bottom=32;
	const middle=64;
	const client=128;
	const custom=256;
	static function aligntostyle($align)
	{  	$str="";
	$kln=$align;
	if ($kln>=Ealign::middle){$kln%=Ealign::middle;$str.="vertical-align:middle;";}
	if ($kln>=Ealign::bottom){$kln%=Ealign::bottom;$str.="vertical-align:bottom;";}
	if ($kln>=Ealign::top){$kln%=Ealign::top;$str.="vertical-align:top;";}
	if ($kln>=Ealign::center){$kln%=Ealign::center;$str.="text-align:center;";}
	if ($kln>=Ealign::right){$kln%=Ealign::right;$str.="text-align:right;";}
	if ($kln>=Ealign::left){$kln%=Ealign::left;$str.="text-align:left;";}
	return $str;
	}
}
function array_insert(&$array, $value, $index)
{
    return $array = array_merge(array_splice($array, max(0, $index - 1)), array($value), $array);
}
class tfieldkind {const fkData=0;const fkCalculated=2;const fkLookup=4;const fkInternalCalc=8;const fkAggregate=16;}
class tfieldControlType {const ct_edit=0;const ct_combobox=1;const ct_checkbox=2;const ct_textbox=3;}
class tfielddisplaytype{const boolean="boolean";const graphic="graphic";const text="text";const string="string";const date="date";const year="year";const time="time";const datetime="datetime";const number="number";const money="money";const float="float";const data="data";}
class tdatabase
{
	private $_open;
	public $connection;
	public $databasename;
	public function open($value=null)
	{
		global $baglanti;
		global $db;
		
		if(!isset($this->connection))
		{
			$this->connection=$baglanti;
			
		}
			
			if(isset($value))
			{
				if($value!=$this->_open)
				{ 
				

				    $this->_open=mysqli_select_db($this->connection,$this->databasename);
				}
			} 
			
			return $this->_open;
	}
}
	function getpickuplist($tb,$vfield,$listfields,$keyfield=null,$keyvalue=null) 
	{
			$str="";
			$frst=true;
			global $baglanti;
			$qry="SELECT `".$vfield."` , `".$listfields."` FROM ".$tb;
			if($keyfield!=null) {$qry=$qry." WHERE ".$keyfield."=".$keyvalue;}
			$data=mysqli_query($baglanti,$qry);
			while ($row = mysqli_fetch_array($data, mysqli_NUM)) 
			{
				if (!$frst)
				{ 
					$str.="|-";
				}
				$frst=false;
				$str.=$row[0];
				$frst1=true;
				for($i=0;$i<count($row);$i++)
				{
					
					if (!$frst1)
					{ 
						$str.="/-";
					}
					$str.=$row[i];
					$frst1=false;
				}
				
			}
			mysqli_free_result($data);
			return $str;
	}
class tfield
{
	
	private $_query;
	public	function __construct($query)
	{
		$this->_query=$query;
	}
	public $_fieldname;function fieldname(){return $this->_fieldname;}
	public $_fieldtype="";function fieldtype($value=null){if(isset($value)){$this->_fieldtype=$value;$this->finddisplaytype();}else return $this->_fieldtype;}
	public function finddisplaytype()
	{
		if(isset($this->_fieldtype))
		{
			switch ($this->_fieldtype)
			{
				case "tinyint":
				if($this->_size!=1)
				{
					$this->_displaywidth=75;$this->_displaytype="number";
					}else
					{
						$this->_displaytype="boolean";
					} 
					break;
				case "boolean":case "bit":$this->_displaytype="boolean";break;
				case "bigint":case "int":case "smallint":case "mediumint":$this->_displaytype="number";$this->_displaywidth=75;break;
				case "real":case "decimal":case "double":case "float":$this->_displaytype="float";$this->_displaywidth=75;break;
				case "datetime":case "timestamp":$this->_displaytype="datetime";$this->_displaywidth=100;break;
				case "year":$this->_displaytype="year";$this->_displaywidth=75;break;
				case "time":$this->_displaytype="time";$this->_displaywidth=75;break;case "date":$this->_displaytype="date";$this->_displaywidth=100;break;
				case "char":case "varchar":$this->_displaytype="string";$this->_displaywidth=100;break;
				case "binary":case "varbinary":case "blob":case "mediumblob":
				case "largeblob": $this->_displaytype="data";$this->_displaywidth=100;break;
				case "tinytext":case "mediumtext":case"text":
				case "largetext": $this->_displaytype="text";$this->_displaywidth=100;break;
				default:  $this->_displaytype="string";$this->_displaywidth=100;break;
			}
		}
		return $this->_displaytype;
	}
	function __call($met,$arg)
 	{
 		
 		if($met=="calcfunc" )
 		{
 			echo var_dump($arg);
 			return call_user_func_array($this->{$met},$arg);
 		}
 	}
	public function calculate()
	{
		return $this->calcfunc($this->_query);
	}
	public $_displaytype="string";
	public function displaytype($value=null){if(isset($value)){$this->_displaytype=$value;}else return $this->_displaytype;}
	public $displayname;
	public $fieldkind=tfieldkind::fkData;
	public $suffix;
	public $prefix;
	public $calcfunc;
	public $mask="";
	public $share=true;
	public $keyfield=false;
	public $_fieldno;function fieldno(){return $this->_fieldno;}
	public $readonly=false;
	public $alignment=Ealign::center;
	public $_visible=true;function visible(){return $this->_visible;}
	public $_unsigned=false;function unsigned(){return $this->_unsigned;}
	public $_auto_increment=false;function auto_increment(){return $this->_auto_increment;}
	public $_primary_key="";function primary_key(){return $this->_primary_key;}//"PRI =>primary key,MUL=>multiple key
	public $_unique_key=false;function unique_key(){return $this->_unique_key;}
	public $_multible_key=false;function multiple_key(){return $this->_multible_key;}
	public $_required=false;function required(){return $this->_required;}
	public $_maxlength=0;function maxlength(){return $this->_maxlength;}
	public $pickuplist=null;
	public $lukeyfield="";
	public $lukeyvalue="";
	public $lulistfield="";
	public $luvaluefield="";
	public $lutable="";
	public $lufield=null;
	public $ludbase="";

	public $dateEditFormat ="09/09/0000";
	public $datetimeEditFormat ="09/09/0000 09:09:09";
	public $datetimeDisplayFormat = "dd/mm/yyyy hh:nn:ss";
	public $dateDisplayFormat = "ddd mmm yyyy";
	public $floatFormat ="";//  "###.###.###,00"
	public $boolTrueString='';
	public $boolFalseString='';
	public $controlType=0;
	public $_zerofill=false;function zerofill(){return $this->_zerofill;}
	public $_defaultvalue;function defaultvalue(){return $this->_defaultvalue;}
	//	public $_validating;function validating(){return $this->_validating;}
	public $_size=0;function size(){return $this->_size;}
	public $_decimalsize=0;function decimalsize(){return $this->_decimalsize;}
	public $_value="";function value($value=null){if(isset($value)){$this->_value=$value;}else return $this->_value;}
	public $_basevalue="";function basevalue(){return $this->_basevalue;}
	//	public $_offset;function offset(){return $this->_offset;}
	public $_displaywidth;function displaywidth($value=null){if(isset($value)){$this->_displaywidth=$value;}else return $this->_displaywidth;}

	//maxlegh ve tipe göre display withbul
	public $_displaylabel='';function displaylabel($value=null){if(isset($value)){$this->_displaylabel=$value;}else return $this->_displaylabel;}
}

class tquery
{
	public	function __construct($tablename,$databasename)
	{
		
		if (isset($databasename))
		{
			$this->_database=new tdatabase();
			$this->_database->databasename=$databasename;
			$this->_database->open(true);
		}
		$this->_tablename=$tablename;
	}
	public $_data;
	public $_query;
	public $_tablename;
	public	$_database;
	public $_open;
	private $_rectemp=false;
	public $_keyfieldId=-1;
	public $_fields=array();
	function &fields(){return $this->_fields;}
	function &field($indexorname,$withname=false){if($withname){return $this->_fields[array_search($indexorname,$this->_fields)];} return $this->_fields[$indexorname];}
	private $_recordcount=0;public function recordcount(){return $this->_recordcount;}
	private $_recordno=0;public function recordno($value=null){
		if(isset($value)){$succes=true;
		//if($this->_rectemp )
		$succes=$this->_open && mysqli_data_seek($this->_data,$value);
		//$this->_rectemp=$this->_recordno+1!=$value;
		$this->_recordno=$value;if($succes){return $this->getrecord();}
		else return false;}else return $this->_recordno;}
		private function getrecord()
		{
			if ($this->_open)
			{
				$row=mysqli_fetch_assoc($this->_data);
				if($row)
				{
					for($i=0;$i<count($this->_fields);$i++)
					{
						$val=$row[$this->_fields[$i]->_fieldname];$this->_fields[$i]->_basevalue=$val;
						$this->_fields[$i]->_value=$val;
					}
					return true;
				}return false;
			}

		}
		public function query($query=null){if(isset($query)){ $this->_query=$query;}else return $this->_query;}
		public function execquery()
		{
		    global $baglanti;
		  
			$tq=$this->_query;
			if (!isset($tq)&& isset($this->_tablename))
			$this->query("select * from ".$this->_tablename);
			if(isset($this->_database->connection))
			    $data=mysqli_query($baglanti,$this->_query);
			else
			$data=mysqli_query($baglanti,$this->_query);
			$this->_query=$tq;
			
			if(mysqli_error($baglanti)!="")
			return mysqli_error($baglanti);
			/*if (!is_resource($data))
			{
			    echo "<b>DB Error, could not list tables</b>\n";
			    echo '<b>MySQL Error: ' . mysqli_error($baglanti)."</b>\n";
			    print_r($data);
			return true;
			}
			else {*/
		
				
				$this->_recordno=0;
				if($data!==True)
				$this->_recordcount=mysqli_num_rows($data);
				$this->data($data);
				return true;
		}
		public function tablename($tname=null){if(isset($tname)){ $this->_tablename=$tname;}else return $this->_tablename; }
		public function data($data=null){if(isset($data)){$this->dataupdate();$this->_data=$data;}else{ return $this->_data;}}

		private function dataupdate()
		{
			if(isset($this->_data)) mysqli_free_result($this->_data);
		}
		public function open($open=null)
		{
			
			if(isset($open))
			{
				
				if($open!=$this->_open)
				{
					
					if($open )
					{

						if((isset($this->_database) && $this->_database->open()) || (!isset($this->_database)) )
					{
						$this->_open=$this->execquery();
						
						$this->loadfields();
					}
					}else
					{
						$this->dataupdate();$this->_open=false;
					}
				}
			}
			
			return $this->_open;
		}
		public function findKeyField(){
			$kf=-1;
			for($z=0;$z<count($this->_fields);$z++)
			{
				if ($this->_fields[$z]->share)
				{
					if($kf==-1)
					{
						if ($this->_fields[$z]->auto_increment())
						{$kf=$z;
						$this->_fields[$z]->keyfield=true;
						}else
						if ($this->_fields[$z]->primary_key() || $this->_fields[$z]->multiple_key())
						{$kf=$z;
						$this->_fields[$z]->keyfield=true;
						}else
						if ($this->_fields[$z]->unique_key())
						{$kf=$z;
						$this->_fields[$z]->keyfield=true;}
					}
				}
			}
			$this->_keyfieldId=$kf;
		}
		public function next(){return $this->recordno($this->_recordno+1);}
		public function prior(){ return $this->recordno($this->_recordno-1);}
		public function last(){return $this->recordno($this->_recordcount);}
		public function first(){ return $this->recordno(0);}
		public function moveby($delta){return $this->recordno($this->_recordno+$delta);}
		public function loadfields()
		{
		    global $baglanti;
			$result =mysqli_query($baglanti,"SHOW COLUMNS FROM ".$this->tablename());
			
			if ($result)
			{ 
				$i=0;
				while ($row =mysqli_fetch_assoc($result))
				{
					array_push($this->_fields,$field=new tfield($this));
					$field->_auto_increment=strpos($row["Extra"],"auto_increment")!==false;
					$field->displayname=$row['Field'];
					$field->_fieldname=$row['Field'];
					$field->_fieldno=$i;
					$i++;
					$m=null;$m1=null;
					preg_match_all('/[^\s].[^\s]*/',$row["Type"],$m);

					if ($m!=null&&$m[0])
					for ( $k=0;$k< count($m[0]);$k++)
					{
						if($k==0)
						{
							if( preg_match_all('/.[^\(]*/',$m[0][$k],$m1))
							$field->_fieldtype=$m1[0][0];

							if( preg_match_all('/\d+/',$m[0][$k],$m1))
							if($m1!=null)
							{
								if(isset($m1[0][0]))$field->_size=$m1[0][0];
								if( isset($m1[0][1]))$field->_decimalsize=$m1[0][1];
							}
						}else{
							if($m[0][$k]&&$m[0][$k]=="unsigned")$field->_unsigned=true;
							if($m[0][$k]&&$m[0][$k]=="zerofill")$field->_zerofill=true;
						}
					}

					$field->_required=$row["Null"]=="NO";
					$field->_primary_key=$row['Key']=="PRI";
					$field->_unique_key=$row['Key']=="UNI";
					$field->_multible_key=$row['Key']=="MUL";
					$field->_defaultvalue=$row['Default'];
					$field->finddisplaytype();
				}
			}
			mysqli_free_result($result);
		}
		public function insertfield($index,$fieldtype=tfieldkind::fkCalculated)
		{
			array_insert($this->_fields,$field=new tfield(), $index);
			$field->fieldkind=$fieldtype;
			$field->readonly=true;
			return $field;
			
		}
		public function tableToXML($forform=false)
		{
			$str="";
			global $baglanti;
			if ($this->open(true))
			{

				$str.= "<?xml version=\"1.0\" encoding=\"utf-8\" ?>";
				$str.= "<doc>";
				$this->findKeyField();
				$str.= "<recordCount>{$this->recordcount()}</recordCount>";
				$str.= "<keyField>{$this->_keyfieldId}</keyField>";
				$str.= "<columns>";
				$fields="";
				$this->execquery();

		
				for($z=0;$z<count($this->_fields);$z++)
				{
					if ($this->_fields[$z]->share)
					{
						$fields.=$this->_fields[$z]->_fieldno.";";
						$str.= "<column>";
						$str.= "<id>{$this->_fields[$z]->_fieldno}</id>";
						$str.= "<name>{$this->_fields[$z]->_fieldname}</name>";
						
						$str.= "<defvalue>{$this->_fields[$z]->_defaultvalue}</defvalue>";
						$str.= "<required>{$this->_fields[$z]->required()}</required>";
						$str.= "<autoinc>{$this->_fields[$z]->auto_increment()}</autoinc>";
						if ($this->_fields[$z]->auto_increment())
						{
							$result =mysqli_query($baglanti,"Select `".$this->_fields[$z]->_fieldname."` FROM `".$this->tablename()."` order by `".$this->_fields[$z]->_fieldname."` desc limit 0,1");
								if ($result)
								{ 
									$val=mysqli_fetch_assoc($result);
									$val=$val[$this->_fields[$z]->_fieldname];
									mysqli_free_result($result);
								}
							$str.= "<lastinc>{$val}</lastinc>";	
						}
						$str.= "<primary>{$this->_fields[$z]->primary_key()}</primary>";
						$str.= "<unique>{$this->_fields[$z]->unique_key()}</unique>";
						$str.= "<unsigned>{$this->_fields[$z]->_unsigned}</unsigned>";
						$str.= "<maxlength>{$this->_fields[$z]->maxlength()}</maxlength>";
						$str.= "<size>{$this->_fields[$z]->_size}</size>";
						$str.= "<decimalsize>{$this->_fields[$z]->_decimalsize}</decimalsize>";
						$str.= "<width>{$this->_fields[$z]->displaywidth()}</width>";
						$str.= "<type>{$this->_fields[$z]->_displaytype}</type>";
						$str.= "<zerofill>{$this->_fields[$z]->_zerofill}</zerofill>";
						$str.= "<keyfeild>{$this->_fields[$z]->keyfield}</keyfeild>";
						$str.= 	"</column>";
					}
				}
				$str.= "</columns>";
				$str.= "</doc>";
			}
			return $str;
		}
		public function createForm($formname) {
		$this->formname=$formname;	
		$str="var ".$formname."=new TDBform();";
		$str.=$formname.".tableName='{$this->_tablename}';";
		if ($this->_database)
		$str.="databaseName='{$this->_database->databasename}';";
      $str.=$formname.".recordCount={$this->_recordcount};";
      
      if ($this->open(true))
			{
				for($z=0;$z<count($this->_fields);$z++)
				{
					if ($this->_fields[$z]->share)
					{
						if($this->_fields[$z]->lutable<>"" || !is_null($this->_fields[$z]->pickuplist))
						{
							$str.="var cnt=".$formname.".addControl(2);";
							if (!is_null($this->_fields[$z]->pickuplist))
							$str.= "cnt.createcombobox(".$this->_fields[$z]->pickuplist.");";
							else
							$str.= "cnt.createcombobox(".getpickuplist($this->_fields[$z]->lutable,$this->_fields[$z]->luvaluefield,$this->_fields[$z]->lulistfield,$this->_fields[$z]->lukeyfield,$this->_fields[$z]->lukeyvalue).");";
						}
						else 
						{
						switch ($this->_fields[$z]->_displaytype)
						{
							//const ct_edit=0;const ct_textbox=1 const ct_combobox=2;const ct_checkbox=3;
							case "boolean":
							if($this->_fields[$z]->boolTrueString<>"" && $this->_fields[$z]->boolFalseString<>"")
							{
								$str.="var cnt=".$formname.".addControl(2);";
								$str.= "cnt.createcombobox([0,{$this->_fields[$z]->boolTrueString}],[1,{$this->_fields[$z]->boolFalseString}]);";
							}	
							else 
							{	
								$str.="var cnt=".$formname.".addControl(3);";
							}											
							break;
							case "number":case "float": case "datetime": case "date": case "year":case "time": case "string": 
								$str.="var cnt=".$formname.".addControl(0);";
								if ($this->_fields[$z]->_displaytype=="datetime" && $this->_fields[$z]->datetimeEditFormat<>"")
								{
									
									$str.= "cnt.datetimeEditFormat='{$this->_fields[$z]->datetimeEditFormat }';";
									$str.= "cnt.editMask='{$this->_fields[$z]->datetimeEditFormat }';";
									$str.= "cnt.datetimeDisplayFormat='{$this->_fields[$z]->datetimeDisplayFormat}';";
								}
								if ($this->_fields[$z]->_displaytype=="date")
								{
									$str.= "cnt.dateEditFormat='{$this->_fields[$z]->dateEditFormat }';";
									$str.= "cnt.editMask='{$this->_fields[$z]->dateEditFormat }';";
									$str.= "cnt.dateDisplayFormat='{$this->_fields[$z]->dateDisplayFormat}';";
								}
								if ($this->_fields[$z]->_displaytype=="float")
								{
									$str.= "cnt.floatFormat='{$this->_fields[$z]->floatFormat}';";
								}
								if ($this->_fields[$z]->_displaytype=="string"  && $this->_fields[$z]->mask<>"")
								{
									$str.= "cnt.editMask='{$this->_fields[$z]->mask }';";
								}
								
								/*
										public $datemask=""
									public 
									public $datetimeDisplayFormat : "dd/mm/yyyy hh:nn:ss";
										public $dateDisplayFormat : "ddd mmm yyyy";
								public $floatFormat :"";//  "###.###.###,00"

							const ct_edit=0;ct_datepicker=1;const ct_combobox=2;const ct_checkbox=3;const ct_textbox=4
						*/
						
							break;
							case "text": $str.="var cnt=".$formname.".addControl(1);";break;
						}
						}
						 $bl = Array(false => 'false', true => 'true');
						
						$str.= "cnt.datatype='{$this->_fields[$z]->_displaytype}';";
						$str.= "cnt.fieldname='{$this->_fields[$z]->_fieldname}';";
						$str.= "cnt.defaultvalue='{$this->_fields[$z]->_defaultvalue}';";
						$str.= "cnt.required={$bl[$this->_fields[$z]->required()]};";
						$str.= "cnt.autoinc={$bl[$this->_fields[$z]->auto_increment()]};";
						if ($this->_fields[$z]->auto_increment())
						{
							$result =mysqli_query($baglanti,"Select `".$this->_fields[$z]->_fieldname."` FROM `".$this->tablename()."` order by `".$this->_fields[$z]->_fieldname."` desc limit 0,1");
								if ($result)
								{ 
									$val=mysqli_fetch_assoc($result);
									$val=$val[$this->_fields[$z]->_fieldname];
									mysqli_free_result($result);
								}
							$str.= "cnt.lastinc={$val};";
						}
						$str.= "cnt.primary={$bl[$this->_fields[$z]->primary_key()]};";
						
						$str.= "cnt.unique={$bl[$this->_fields[$z]->unique_key()]};";
						$str.= "cnt.unsigned={$bl[$this->_fields[$z]->_unsigned]};";
						$str.= "cnt.zerofill={$bl[$this->_fields[$z]->_zerofill]};";
						$str.= "cnt.keyfeild={$bl[$this->_fields[$z]->keyfield]};";
						$str.= "cnt.readonly={$bl[$this->_fields[$z]->readonly]};";
						$str.= "cnt.maxlength={$this->_fields[$z]->maxlength()};";
						$str.= "cnt.size={$this->_fields[$z]->_size};";
						$str.= "cnt.decimalsize={$this->_fields[$z]->_decimalsize};";
						if ($this->_fields[$z]->_displaylabel<>"")
						$str.= "cnt.label='{$this->_fields[$z]->_displaylabel}';";
						else
						$str.= "cnt.label='{$this->_fields[$z]->_fieldname}';";
						if  ($this->_fields[$z]->suffix)
							$str.= "cnt.suffix='{$this->_fields[$z]->suffix}';";
						if  ($this->_fields[$z]->prefix)		
						$str.= "cnt.prefix='{$this->_fields[$z]->prefix}';";
						
						if($this->_fields[$z]->lutable<>"")
						{
							$str.= "cnt.lutable='{$this->_fields[$z]->lutable}';";
							$str.= "cnt.luvaluefield='{$this->_fields[$z]->luvaluefield}';";
							$str.= "cnt.lulistfield='{$this->_fields[$z]->lulistfield}';";
							$str.= "cnt.lukeyfield='{$this->_fields[$z]->lukeyfield}';";
							$str.= "cnt.lukeyvalue='{$this->_fields[$z]->lukeyvalue}';";
						}
				}
				}
			}			
			return $str;
		}
		public function readDataToXML($from=null,$readcount=null,$sortField=null,$sortMode=null)//  "###.###.###,00""tField=null,$sortMode=null)
		{
			global $baglanti;
			if ($this->open(true))
			{
				$tq=$this->_query;
				
				if(!isset($tq))
					$this->_query.="select * from ".$this->_tablename;
				if($sortField!=null)
				$this->_query.=" ORDER BY `".$sortField."` ".$sortMode;	
				
				if($readcount!=null)
				{
					$this->_query.=" LIMIT ".$from.",".$readcount;
				}
				$this->execquery();
				$str="";
				$str.="<?xml version=\"1.0\" encoding=\"utf-8\" ?>\r";
				$str.="<doc>";
				
				while ($row = mysqli_fetch_array($this->data(), MYSQLI_NUM)) {
					$str.="<row>";
					
					for($i=0;$i<count($this->_fields);$i++)
					{
						if($this->_fields[$i]->share)
						$str.="<colm>{$row[$this->_fields[$i]->_fieldno]}</colm>";
					}
					$str.="</row>";
				}
				$str.="</doc>";
				
				$this->_query=$tq;
				return $str;
			}
			
			
		}
		public function updateFromXML($xml)
		{
			//$this->_query="";
	
			if($this->open(true))
			{
				global $baglanti;
				$rtn=true;
				$xml=str_replace('\"', '"', $xml);
				$xmld=simplexml_load_string((String)$xml);
				$fields=array();
				$keyf="";
				foreach ($xmld->children() as $sg) {
					if ($sg->getName()=="fields")
					{

						for($z=0;$z<count($this->_fields);$z++)
						{
								if ($this->_fields[$z]->share)
								array_push($fields, "`".$this->_fields[$z]->_fieldname."`");
						}
					}
					if ($sg->getName()=="kf")
					{
							
						$keyf="`".$this->_fields[(int) $sg]->_fieldname."`";
					}
					if ($sg->getName()=="insert")
					{
						

						$strb="INSERT INTO ".($this->_database?"`".$this->_database."`":"")."`".$this->_tablename."` (";
						
						$strb.=implode(",", $fields).") VALUES";
						$k=0;
						foreach ($sg->children() as $row)
						{
							if ($row->getName()=="row")
							{
								$strb.=$k==0?"(":",(";
								$i=0;
								foreach ($row->children() as $data)
								{
									if ($data->getName()=="d")
									{
										if((string)$data[0]=="NULL")
										$strb.=($i!=0?",":"").mysqli_real_escape_string($baglanti,(string)$data[0]);
										else
										$strb.=($i!=0?",":"")."'".mysqli_real_escape_string($baglanti,(string)$data[0])."'";
										$i++;
									}
								}//enddata
								$strb.=")";
								$k++;
							}
						}//endrow
						$this->_query=$strb;
						$rtn=$this->execquery();
						
						if($rtn!==true)
						echo "Ekleme işlemi sırasında bir hata oluştu\r Hata: ".$rtn;
					}//endinsert
					if ($sg->getName()=="delete")
					{

						foreach ($sg->children() as $row)
						{
							if ((string)$row->getName()=="row")
							{

								$strb="DELETE FROM ".($this->_database?"`".$this->_database."`":"")."`".$this->_tablename."` WHERE ";
									
								{
									$i=0;
									foreach ($row->children() as $data)
									{
										if($keyf!="")
										{
											$strb.=$keyf."='".mysqli_real_escape_string($baglanti,(string)$data[0])."'";
										}else
										if ($data->getName()=="d")
										{
											$strb.=($i!=0?" AND ":"").$fields[$i]."='".mysqli_real_escape_string($baglanti,(string)$data[0])."'";
											$i++; 
										}
									}//enddata
								}
								$strb.=" LIMIT 1";
								$this->_query=$strb;
								$rtn=$this->execquery();
						if($rtn!==true)
						echo "Silme işlemi sırasında bir hata oluştu\rHata: ".$rtn;	
							}

						}//endrow

					}//enddelete
					if ($sg->getName()=="update")
					{
							
						foreach ($sg->children() as $row)
						{
							$strb="UPDATE ".($this->_database?"`".$this->_database."`":"")."`".$this->_tablename."` SET ";

							if ($row->getName()=="row")
							{
								$i=0;
								foreach ($row->updatas->children() as $udata)
								{

									$strb.=($i!=0?",":"")."`".$this->_fields[(int)$udata->attributes()->fieldId]->_fieldname."`"."='".mysqli_real_escape_string($baglanti,(string)$udata[0])."' ";
									$i++;
								}
								$strb.=" WHERE ";
								$i=0;
								foreach ($row->datas->children() as $data)
								{
										
									if ($data->getName()=="d")
									{
										if($keyf!="")
										{
											$strb.=$keyf."='".mysqli_real_escape_string($baglanti,(string)$data[0])."'";
										}else
										$strb.=($i!=0?" AND ":"").$fields[$i]."='".mysqli_real_escape_string($baglanti,(string)$data[0])."'";
										$i++;
									}
								}//enddata
							}
							$strb.=" LIMIT 1";
							$this->_query=$strb;
							$rtn=$this->execquery();
						if($rtn!==true)
						echo "Verilerin güncellenmesi  sırasında bir hata oluştu\r Hata: ".$rtn;	
						}//endrow

					}//endupdate
				}
			}
		}

}


function tr2tr($str)
{
	$str = str_replace("�","&ccedil;",$str);
	$str = str_replace("�","&#287;",$str);
	$str = str_replace("�","&#305;",$str);
	$str = str_replace("�","&ouml;",$str);
	$str = str_replace("�","&uuml;",$str);
	$str = str_replace("�","&#351;",$str);
	$str = str_replace("�","&Ccedil;",$str);
	$str = str_replace("�","&#286;",$str);
	$str = str_replace("�","&#304;",$str);
	$str = str_replace("�","&Ouml;",$str);
	$str = str_replace("�","&Uuml;",$str);
	$str = str_replace("�","&#350;",$str);

	return $str;
}

function htmlfilter($value)
{

	echo str_replace(array("<","<",'"',"'"),array("&lt;","&gt;","&quot;","&#039;"),$value);
	return $value;
}

function queryfilter($value)
{
	return mysqli_real_escape_string($baglanti,$value);
}

/**
* Fonksiyon $table de�i�keni ile verilen tabloya SELECT komutunu uygular $id de�i�keniyle verilen kay�t bulunur.
*
* @param String $table
* @param bilinmeyen $id
* @return Yap�lan sorgu
*/
function queryselectwithid($table,$id)
{
    global $baglanti;
	$str="SELECT * FROM ".mysqli_real_escape_string($baglanti,$table)." WHERE id='$id'";
	return mysqli_query($baglanti,$str);
}
/**
* Fonksiyon $table de�i�keni ile verilen tabloya (user)kullan�c� ad� ve pass(pasaport) parametreleri ile SELECT komutunu uygular
*
* @param String $table
* @param string $user
* @param string $user
* @return Yap�lan sorgu
*/
function queryselectwithuserpass($table,$user,$pass)
{
    global $baglanti;
	$str="SELECT * FROM ".mysqli_real_escape_string($baglanti,$table)." WHERE (kullaniciid='".mysqli_real_escape_string($baglanti,$user)."') and (parola='".mysqli_real_escape_string($baglanti,$pass)."')";
	return mysqli_query($baglanti,$str);
}
function queryselect($table,$text="")
{
    global $baglanti;
	$str="SELECT * FROM ".mysqli_real_escape_string($baglanti,$table)." ".$text;

	return mysqli_query($baglanti,$str);

}
/**
* Bu fonksiyon dizi olarak verilen alan ve verileri $table de�i�keni ile verilen tabloya ekler.Not:Veri giri�inde sql escape kontrol�n� yok.
*
*
* @param string_type $table
* @param array_type $alanveris
*/
function queryinsertwitharray($table,$alansveris)
{
    global $baglanti;
	$alanlar="";
	$veriler="";
	$ilk=true;
	while (list($key,$veris)=each($alansveris))
	{
		if($ilk)
		{
			//if (isset($veris))
			//{
			$alanlar.= "$key";
			$veriler.="'$veris'";
			$ilk=false;
			//}
		}else
		{
			/*	if (isset($veris))
			{*/
			$alanlar.=","."$key";
			$veriler.=","."'$veris'";
			//}
		}
	}

	$return= mysqli_query($baglanti,"INSERT INTO $table ( ".$alanlar." ) VALUES( ".$veriler." )" );
	echo  mysqli_error();

	return $return;
}

/**
* Bu fonksiyon dizi olarak verilen alan ve verileri $table de�i�keni ile verilen tabloya ekler.Not:Veri giri�inde sql escape kontrol�n� kendi yapar.
*
*
* @param string_type $table
* @param array_type $alans
* @param array_type $veris
*/

function queryinsert($table,$alans,$veris)
{
    global $baglanti;
	$strb="INSERT INTO $table (";
	$alanlar="";
	foreach($alans as $key )
	{
		if($key<>$alans[0])
		$alanlar.=",";
		$alanlar.= mysqli_real_escape_string($baglanti,$key);
	}
	$strb.=$alanlar.") VALUES(";
	$strs=$strb;
	$veriler;
	for ($i=0;$i<count($veris) ;$i++)
	{
		if (($i+1)% (count($alans))==0 )
		{
			$veriler.="'".mysqli_real_escape_string($baglanti,$veris[$i])."'";
			$strs.=$veriler.")";
			$strs=$strb;
			mysqli_query($baglanti,$strs);
			$strs=$strb;
			$veriler="";
		}else
		{
			$veriler.="'$veris[$i]',";
		}
	}
}
/**
* $table de�i�keni ile belirtilen tabloya $post  dizisiyle girilen verileri girer.$post dizisinin Keyleri tablodaki alan adlar� ile ayn� olmal�d�r.
*
* @param String $table
* @param  Array $post
* @return Yap�lan sorgu
*/
function queryinsertpost($table,$post)
{
    global $baglanti;
	$keys=array_keys($post);
	$values=array_values($post);
	$result = mysqli_query($baglanti,"SHOW COLUMNS FROM ".mysqli_real_escape_string($baglanti,$table));
	$strb="INSERT INTO $table(";
	$alanlar="";
	$veriler="";

	if (mysqli_num_rows($result) > 0)
	{
		while ($row = mysqli_fetch_assoc($result))
		{
			$field=mysqli_real_escape_string($baglanti,$row['Field']);
			if (array_key_exists($field,$post))
			{
				$value="'".mysqli_real_escape_string($baglanti,$post[$field])."'";

				$alanlar.=($alanlar=="")?$field:','.$field;
				$veriler.=($veriler=="")?$value:",$value";
			}
		}

		mysqli_free_result($result);
	}
	$strb.=$alanlar.")"." VALUES(".$veriler.")";
	return mysqli_query($baglanti,$strb);
}
/**
* XML dosyas�n� tabloya aktar�r.
*
* @param tablo_ismi $tablo
* @param xml_dosyas� $file
* @param aktar�ma_kat�lm�ycak_alanlar�n_dizisi $haricialans
*/

function xmltotable($tablo,$file,$haricialans=null)
{
   
	$xml=new XMLReader();

	$xml->open($file,'utf-8');
	$alanveris;
	$oku=false;
	$empty=false;
	$fname="";
	while ($xml->read())
	{
		if ($xml->name=="row" && $xml->nodeType==1)
		{	$basla=true;unset($alanveris); }
		if ($xml->name=="row" && $xml->nodeType==15)
		{
			queryinsertwitharray($tablo,$alanveris);
			print_r($alanveris);
			$basla=false;
		}
		if ($oku )
		{
			if( !($haricialans!=null && in_array($fname,$haricialans)))
			if ($empty)
			$alanveris[$fname]=null;
			else
			$alanveris[$fname]=$xml->value;

		}
		if (($xml->name=="field" || $xml->isEmptyElement)&& $xml->nodeType!=15 )
		{
			if ($xml->hasAttributes)
			$fname=$xml->getAttribute("name");
			else
			$fname=$xml->name;
			$empty=$xml->isEmptyElement;
			$oku=true;
		}
		else $oku=false;
		//	echo "name=".$xml->name." - "."type=".$xml->nodeType.'- hasvalue "'.$xml->hasValue.'" - value "'.$xml->value.'" - hasAttrib "'.$xml->hasAttributes.'" - emptyelement "'.$xml->isEmptyElement.'"' ."<br/>";
	}
	$xml->close();
	unset($xml);
}
/**
* Tablonun autoinc alan� hari� t�m alan isimlerini d�nderir
*
* @param STRING $table
* @return Array alanisimleri
*/
function querycolumnnames($table)
{
    global $baglanti;
	$isimler=array();
	$result = mysqli_query($baglanti,"SHOW COLUMNS FROM ".mysqli_real_escape_string($baglanti,$table));
	if (mysqli_num_rows($result) > 0)
	{
		while ($row = mysqli_fetch_assoc($result))
		{
			if ($row[Extra]!="auto_increment")
			{
				$isimler[$row['Field']]=$row['Field'];
			}

		}
		return $isimler;
	}
}
/**
* Tablonun autoinc alan� hari� t�m alanlar�n� d�nderir
*
* @param STRING $table
* @return Array alanlar
*/
function querycolumns($table)
{
    global $baglanti;
	$alanlar=array();
	$result = mysqli_query($baglanti,"SHOW COLUMNS FROM ".mysqli_real_escape_string($baglanti,$table));
	if (mysqli_num_rows($result) > 0)
	{
		$i=0;
		while ($row = mysqli_fetch_assoc($result))
		{

			$alanlar[$row['Field']]=$row;
			$alanlar[$row['Field']]['id']=$i;

			$i++;

		}
		return $alanlar;
	}
}
/**
* Tablonun Alan isimlerini varsa takma isimleriyle d�nderir.
*
* @param String $table
* @return Array Alanisimleri
*/
function querycolumnnameswithaliasnames($table)
{
	$alanisimleri=querycolumnnames($table);
	$result=queryselect('tabloalanisimleri',"where tabloismi='".$table."'");
	while ($row=mysqli_fetch_assoc($result))
	{
		if	(array_key_exists($row['alanismi'],$alanisimleri))
		$alanisimleri[$row['alanismi']]=$row['takmaisim'];
	}
	return $alanisimleri;
}
/**
* Tablonun Alanlar�  varsa takma isimleriyle ve �zellikleriyle d�nderir.
*
* @param String $table
* @return Array Alanisimleri
*/
function querycolumnswithaliasnames($table)
{
	$alanlar=querycolumns($table);
	$result=queryselect('tabloalanisimleri',"where tabloismi='".$table."'");
	while ($row=mysqli_fetch_assoc($result))
	{
		if	(array_key_exists($row['alanismi'],$alanlar))
		$alanlar[$row['alanismi']]['Field']=$row['takmaisim'];
	}
	return $alanlar;
}
/**
* function querydatabasenames database isimlerini d�nderir
* @param $connection  (se�ime ba�l�) Mysql ba�lant� linki
* @return (Array) database isimleri
*/
function querydatabasenames($connection=null)
{
    
	if ($connection!=null)
	$result = mysqli_query( $connection,"SHOW DATABASES");
	$r= array();
	while( $row = mysqli_fetch_object( $result ) )
	{
		array_push($r,$row->Database);
	}
	mysqli_free_result($result);
	return $r;
}
/**
* function querytablenames tablo isimleri
* @param $connection  (se�ime ba�l�) Mysql ba�lant� linki
* @return (Array) verilen database'e ait tablo isimleri
*/
function querytablenames($dbname)
{
    global $baglanti;
	$sql = "SHOW TABLES FROM $dbname";
	$result = mysqli_query($baglanti,$sql);
	$alanlar=array();
	if (!$result) {
		echo "DB Error, could not list tables\n";
		echo 'MySQL Error: ' . mysqli_error();
		exit;
	}
	while ($row = mysqli_fetch_row($result)) {
		array_push( $alanlar,$row[0]);
	}
	mysqli_free_result($result);
	return $alanlar;

}
function enum_valueinenum($enum,$value)
{
	if ($enum<$value)
	return false;
	$a=$enum;
	$b=1;
	if ($a==$value)
	return true;
	while (!(($a=$a >> 1)==1) || ($b<=$value) ) {
		$b=$b <<1;
		if ($b==$value)
		return $a%2==1;

	}
	return true;
}
function enum_valuesinenum($enum,$values=array())
{
	while (list(,$val)=each($values))
	{
		$rst=enum_valueinenum($enum,$val);
		if (!rst)
		return false;
	}
	return true;

}
class enum {
	private $__this = array();
	public $szero=false;
	function __construct()
	{
		$args = func_get_args();
		$i = 0;
		do{
			$k=$szero?$i:$i+1;

			$this->__this[$args[$i]] =$szero && $i==0?$i:2<<$k;
		} while(count($args) > ++$i);
	}
	public function __get($n){
		return $this->__this[$n];

	}
	public function valuetostring($val)
	{
		return array_search($val,$this->__this);
	}
	public function stringtovalue($val)
	{
		return $this->__this[$val];
	}
};


?>