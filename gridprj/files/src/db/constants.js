export const DB = {
fieldTypes: {
string: 0,
text: 1,
mask: 2,
email: 3,
date: 4,
time: 5,
datetime: 6,
year: 7,
number: 8,
single: 9,
float: 10,
money: 11,
memo: 12,
boolean: 13,
graphic: 14
},
errors: {
wrongData: "Alan tipi ile girilen veri uyusmumuyor.",
wrongDate: "Yanlis tarih girisi.",
longData: "Alana girilmesi gerekenden baska veri girdiniz.",
dublicateData: "Bu alana tekrar eden veri giremezsiniz.",
wrongTime: "Yanlis zaman girdiniz",
unsignedData: "Bu alana sadece pozitif sayilar girebilirsiniz.",
autoincField: "Alan otomatik artan sayi tipinde.",
requriedData: "Alani bos birakamazsiniz."
}
}
