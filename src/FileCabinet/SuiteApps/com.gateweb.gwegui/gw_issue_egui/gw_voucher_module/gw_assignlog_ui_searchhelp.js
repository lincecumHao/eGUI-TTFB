/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search', 'N/currentRecord', 'N/url', '../gw_common_utility/gw_common_migxml_utility', '../gw_common_utility/gw_common_gwmessage_utility'], 
   function(search, currentRecord ,url, migxmlutility, gwmessage) {
    
   var _assignLogSearchId         = 'customsearch_gw_assignlog_search'; 
   var _gw_voucher_main_search_id = 'customsearch_gw_voucher_main_search';
    
   var _current_record = currentRecord.get();   
   
   function validate() { 
        var _error_message = '';
		try {  
	         var _year_month = _current_record.getValue({
				   fieldId: 'custpage_year_month'
			 }); 
			 
			 if (_year_month.length !=5)_error_message+='請輸入正確發票期別';			 
		 
		} catch(e) { 
             console.log(e.name+':'+e.message); 		
		} 
		return _error_message;
   }
   
   //下載
   function downloadEmptyFile(format_file) { 
		try {  
		     var _error_message = validate();
			 if (_error_message.length !=0) {
				 alert(_error_message);
				 return;
			 } else {
				 var _business_no = _current_record.getValue({
					   fieldId: 'custpage_businessno'
				 }); 
				 var _year_month = _current_record.getValue({
					   fieldId: 'custpage_year_month'
				 }); 
				 //////////////////////////////////////////////////////////////////////
				 //字軌狀態
				 var _assign_log_status_ary = [];
				 
				 //一般字軌
				 var _common_unused = _current_record.getValue({
					   fieldId: 'custpage_common_unused'
				 });
				 if (_common_unused==true) {
					 _assign_log_status_ary.push('11');
				 }
				 var _common_used = _current_record.getValue({
					   fieldId: 'custpage_common_used'
				 });
				 if (_common_used==true) {
					 _assign_log_status_ary.push('12');
				 }
				 var _common_finished = _current_record.getValue({
					   fieldId: 'custpage_common_finished'
				 });
				 if (_common_finished==true) {
					 _assign_log_status_ary.push('13');
				 }
				 var _common_void = _current_record.getValue({
					   fieldId: 'custpage_common_void'
				 });
				 if (_common_void==true) {
					 _assign_log_status_ary.push('14');
				 }
				 //外部字軌
				 var _manual_unused = _current_record.getValue({
					   fieldId: 'custpage_manual_unused'
				 });
				 if (_manual_unused==true) {
					 _assign_log_status_ary.push('21');
				 }
				 var _manual_used = _current_record.getValue({
					   fieldId: 'custpage_manual_used'
				 });
				 if (_manual_used==true) {
					 _assign_log_status_ary.push('22');
				 }
				 var _manual_finished = _current_record.getValue({
					   fieldId: 'custpage_manual_finished'
				 });
				 if (_manual_finished==true) {
					 _assign_log_status_ary.push('23');
				 }
				 var _manual_void = _current_record.getValue({
					   fieldId: 'custpage_manual_void'
				 });
				 if (_manual_void==true) {
					 _assign_log_status_ary.push('24');
				 } 
				 //////////////////////////////////////////////////////////////////////
				 //格式代碼
				 var _format_code_ary = [];
				 
				 var _format_code_31_01 = _current_record.getValue({
					   fieldId: 'custpage_format_code_31_01'
				 });
				 if (_format_code_31_01==true) {
					 _format_code_ary.push('31-01');
				 }
				 var _format_code_31_05 = _current_record.getValue({
					   fieldId: 'custpage_format_code_31_05'
				 });
				 if (_format_code_31_05==true) {
					 _format_code_ary.push('31-05');
				 }
				 var _format_code_32_02 = _current_record.getValue({
					   fieldId: 'custpage_format_code_32_02'
				 });
				 if (_format_code_32_02==true) {
					 _format_code_ary.push('32-02');
				 }
				 var _format_code_32_03 = _current_record.getValue({
					   fieldId: 'custpage_format_code_32_03'
				 });
				 if (_format_code_32_03==true) {
					 _format_code_ary.push('32-03');
				 } 
				 var _format_code_35_06 = _current_record.getValue({
					   fieldId: 'custpage_format_code_35_06'
				 });
				 if (_format_code_35_06==true) {
					 _format_code_ary.push('35-06');
				 }
				 var _format_code_35_07 = _current_record.getValue({
					   fieldId: 'custpage_format_code_35_07'
				 });
				 if (_format_code_35_07==true) {
					 _format_code_ary.push('35-07');
				 }  
				 //////////////////////////////////////////////////////////////////////
				 //發票類別條件
				 //電子發票
				 var _egui_electric = _current_record.getValue({
					   fieldId: 'custpage_egui_electric'
				 }); 
				 //外部發票
				 var _egui_manual = _current_record.getValue({
					   fieldId: 'custpage_egui_manual'
				 });  
				  
				 //////////////////////////////////////////////////////////////////////
				 //字軌檔清單+發票資料				 
				 var _empty_invoice_ary = searchEmptyAssignLog(_business_no, _year_month, _assign_log_status_ary, _format_code_ary, _egui_electric, _egui_manual);
				 
				 //產生下載檔-CSV
				 genE0402File(format_file, _business_no, _year_month, _empty_invoice_ary);
 
			 }
		} catch(e) { 
             console.log(e.name+':'+e.message); 		
		} 
   }
   
   //產生下載檔-CSV
   function genE0402File(format_file, business_no, year_month, empty_invoice_ary) { 
		try {  
		     var _json_obj_ary = [];
		     if (empty_invoice_ary !=null) { 
			 
			     var _index_number = 1;
				 var _pre_end_invoice_track  = '';
				 var _pre_end_invoice_number = '';
				 
				 for (var i=0; i<empty_invoice_ary.length; i++) {
					  var _json_obj = empty_invoice_ary[i];
					  //alert('json_obj='+JSON.stringify(_json_obj));
					  var _business_no   = _json_obj.business_no;
					  var _year_month    = _json_obj.year_month;
					  var _invoice_track = _json_obj.invoice_track;
					  var _start_no      = prependZero(_json_obj.start_no, 8);
					  var _end_no        = prependZero(_json_obj.end_no, 8);
					  var _invoice_type  = _json_obj.invoice_type; 
					  /////////////////////////////////////////////////////////////////////
					  //TODO 
 					  if (checkIsSeqNumber(_start_no, _pre_end_invoice_number)==false ||
					     _invoice_track != _pre_end_invoice_track) {
						  //不連續處理
						  var _seq_json_ary_obj = [];
					  
						  var _index = prependZero(_index_number, 5);
						  _index_number++;
						  
						  _seq_json_ary_obj.push(_index);
						  _seq_json_ary_obj.push(_business_no);
						  _seq_json_ary_obj.push(_year_month);
						  _seq_json_ary_obj.push(_invoice_track);
						  _seq_json_ary_obj.push(_start_no);
						  _seq_json_ary_obj.push(_end_no);
						  _seq_json_ary_obj.push(_invoice_type);
											   
						  _json_obj_ary.push(_seq_json_ary_obj);	
					  } else {
						  //抓最後一筆
						  var _seq_json_ary_obj = _json_obj_ary[_json_obj_ary.length-1];
						   
						  //截止發票號碼
						  _seq_json_ary_obj[5] = _end_no;
						  _json_obj_ary[_json_obj_ary.length-1] = _seq_json_ary_obj;
					  }	 
					  
					  _pre_end_invoice_track  = _invoice_track;
					  _pre_end_invoice_number = _end_no;
					  ///////////////////////////////////////////////////////////////////// 
				 }				 
			 }
			 	 
			 //產生並下載檔案  business_no, year_month
			 if (format_file=='csv') {
				 var _file_name = business_no + '_' + year_month + '.csv';			 
				 var _content = _json_obj_ary.map(function(d){
						return d.join();
				 }).join('\n');
			 
				 downloadFile(_file_name, _content);
			 } else {
				 uploadEmptyXml(business_no, year_month, _json_obj_ary);
			 }
		 
		} catch(e) { 
             console.log(e.name+':'+e.message); 		
		} 
   }
  
   function prependZero(value, totalLength) { 
      var padChar = '0';	
      return value.toString().padStart(totalLength, padChar); 	
   }
   
   //TODO 
   function checkIsSeqNumber(start_invoice_number, pre_end_invoice_number) { 
      var _result = false;
      try {   
	       if (pre_end_invoice_number.length !=0) { 
			   pre_end_invoice_number = add(pre_end_invoice_number, '1');  
			   if (parseFloat(start_invoice_number)==parseFloat(pre_end_invoice_number))_result = true;
		   } 
	  } catch(e) { 
		 console.log(e.name+':'+e.message); 		
	  }
      return _result;	  
   }
   
   //空白字軌
   function searchEmptyAssignLog(business_no, year_month, assign_log_status_ary, format_code_ary , egui_electric, egui_manual) {
		var _empty_invoice_ary = {}; 
		try {  
			 //空白字軌清單 
			 var _empty_assign_log_ary = searchAssignLog(business_no, year_month, assign_log_status_ary, format_code_ary);
			 
			 //開立錯誤清單
			 var _upload_status = 'E';
			 var _error_invoice_ary = searchVoucherList(business_no, year_month, _upload_status, format_code_ary, egui_electric, egui_manual);
		       
		     //合併結果
		     _empty_invoice_ary = _empty_assign_log_ary.concat(_error_invoice_ary);
			 
		} catch(e) { 
             console.log(e.name+':'+e.message); 		
		}
		return _empty_invoice_ary;
   }
   
   //字軌檔清單
   function searchAssignLog(business_no, year_month, assign_status_ary, format_code_ary) {
		var _assign_log_ary = []; 
		try {
			var _mySearch = search.load({
				id: _assignLogSearchId 
			});
			var _filterArray = [];  
			_filterArray.push(['custrecord_gw_assignlog_businessno',search.Operator.IS, business_no]);				
			_filterArray.push('and');
			_filterArray.push(['custrecord_gw_assignlog_yearmonth',search.Operator.IS, year_month]);				
			
			//字軌狀態-TODO
			if (assign_status_ary.length !=0) {
			    _filterArray.push('and'); 
			    //_filterArray.push(['custrecord_gw_assignlog_status', search.Operator.ANY, assign_status_ary]); 
				//_filterArray.push(['custrecord_gw_assignlog_status', search.Operator.CONTAINS, assign_status_ary]); 
		 	   
				var _subFilterArray = []; 
				for (var i=0; i<assign_status_ary.length; i++) {
					 var _status = assign_status_ary[i];
					 if (i!=0) _subFilterArray.push('or');  
				     _subFilterArray.push(['custrecord_gw_assignlog_status', search.Operator.IS, _status]); 
				}
				_filterArray.push(_subFilterArray);
			}
			
			//格式代碼
			if (format_code_ary.length !=0) { //31-05
			    var _subFilterArray = [];
				_filterArray.push('and'); 
				
			    for (var i=0; i<format_code_ary.length; i++) {
					 var _format_code_str = format_code_ary[i];//31-05
					 
					 var _format_code_ary = _format_code_str.split('-');
					 var _format_code  = _format_code_ary[0];//31
					 var _invoice_type = _format_code_ary[1];//05 
					
					 if (i!=0)_subFilterArray.push('or');
					
					 var _subOrFilterArray = []; 
			         _subOrFilterArray.push(['custrecord_gw_egui_format_code', search.Operator.IS, _format_code]); 
					 _subOrFilterArray.push('and');
			         _subOrFilterArray.push(['custrecord_gw_assignlog_invoicetype', search.Operator.IS, _invoice_type]); 
					
					 _subFilterArray.push(_subOrFilterArray);
				}
				
			    _filterArray.push(_subFilterArray);
			}
			
			_mySearch.filterExpression = _filterArray; 	
						 
			//alert('_filterArray='+JSON.parse(JSON.stringify(_filterArray)));
			
			_mySearch.run().each(function(result) {
				
				var _assignlog_businessno = result.getValue({
					name: 'custrecord_gw_assignlog_businessno'
				});
				var _assignlog_yearmonth = result.getValue({
					name: 'custrecord_gw_assignlog_yearmonth'
				});
				var _assignlog_invoicetrack = result.getValue({
					name: 'custrecord_gw_assignlog_invoicetrack'
				});
				var _assignlog_lastinvnumber = result.getValue({
					name: 'custrecord_gw_assignlog_lastinvnumbe'
				});
				var _assignlog_startno = result.getValue({
					name: 'custrecord_gw_assignlog_startno'
				});
				var _assignlog_endno = result.getValue({
					name: 'custrecord_gw_assignlog_endno'
				});
				var _assignlog_invoicetype = result.getValue({
					name: 'custrecord_gw_assignlog_invoicetype'
				});
				
				var _egui_format_code = result.getValue({
					name: 'custrecord_gw_egui_format_code'
				});
				
				var _empty_assignlog_startno = _assignlog_startno;
				if (_assignlog_lastinvnumber !='') {
					_empty_assignlog_startno = add(_assignlog_lastinvnumber, '1');
				} else _assignlog_lastinvnumber = '0';
				
				if (parseFloat(_assignlog_lastinvnumber) != parseFloat(_assignlog_endno)) {				
					var _json_ary = {
						'business_no':_assignlog_businessno,
						'year_month':_assignlog_yearmonth,
						'invoice_track':_assignlog_invoicetrack,					
						'start_no':_empty_assignlog_startno,
						'end_no':_assignlog_endno,	
                        'format_code':_egui_format_code,						
						'invoice_type':_assignlog_invoicetype					
					};
					 
					_assign_log_ary.push(_json_ary);
				}
				
				return true;
			}); 
		} catch(e) {
			console.log(e.name+':'+e.message); 
		}
		return _assign_log_ary;
   }
   
   //開立錯誤
   function searchVoucherList(business_no, year_month, upload_status, format_code_ary, egui_electric, egui_manual) {
		var _invoice_ary = []; 
		try {
			var _mySearch = search.load({
				id: _gw_voucher_main_search_id 
			});
			var _filterArray = [];  
			_filterArray.push(['custrecord_gw_voucher_number',search.Operator.ISNOTEMPTY, '']);				
			_filterArray.push('and');
			_filterArray.push(['custrecord_gw_voucher_type',search.Operator.IS, 'EGUI']);				
			_filterArray.push('and');
			_filterArray.push(['custrecord_gw_seller',search.Operator.IS, business_no]);				
			_filterArray.push('and');
			_filterArray.push(['custrecord_gw_voucher_yearmonth',search.Operator.IS, year_month]);				
			_filterArray.push('and');
			_filterArray.push(['custrecord_gw_voucher_upload_status',search.Operator.IS, upload_status]);
		     
			if (egui_electric==true && egui_manual==true) {
				egui_electric=false;
				egui_manual  =false;
			}
			if (egui_electric==true) {
				_filterArray.push('and');
			    _filterArray.push(['custrecord_gw_is_manual_voucher',search.Operator.IS, false]);				
			}
			if (egui_manual==true) {
				_filterArray.push('and');
			    _filterArray.push(['custrecord_gw_is_manual_voucher',search.Operator.IS, true]);				
			}
			 
			//格式代碼
			if (format_code_ary.length !=0) { //31-05
			    var _subFilterArray = [];
				_filterArray.push('and'); 
				
			    for (var i=0; i<format_code_ary.length; i++) {
					 var _format_code_str = format_code_ary[i];//31-05
					 var _format_code_ary = _format_code_str.split('-');
					 var _format_code  = _format_code_ary[0];//31
					 var _invoice_type = _format_code_ary[1];//05 
					
					 if (i!=0)_subFilterArray.push('or');
					
					 var _subOrFilterArray = []; 
			         _subOrFilterArray.push(['custrecord_gw_voucher_format_code', search.Operator.IS, _format_code]); 
					 _subOrFilterArray.push('and');
			         _subOrFilterArray.push(['custrecord_gw_invoice_type', search.Operator.IS, _invoice_type]); 
					
					 _subFilterArray.push(_subOrFilterArray);
				}
				
			    _filterArray.push(_subFilterArray);
			}
			_mySearch.filterExpression = _filterArray; 	
			console.log('_filterArray:'+JSON.stringify(_filterArray)); 
			var _invoice_number_log_ary = [];			
			_mySearch.run().each(function(result) {
				
				var _business_no = result.getValue({
					name: 'custrecord_gw_seller'
				});
				var _year_month = result.getValue({
					name: 'custrecord_gw_voucher_yearmonth'
				}); 
				var _invoice_startno = result.getValue({
					name: 'custrecord_gw_voucher_number'
				}); 
				var _invoice_endno = result.getValue({
					name: 'custrecord_gw_voucher_number'
				});
				var _invoice_type = result.getValue({
					name: 'custrecord_gw_invoice_type'
				});
				 
				var _egui_format_code = result.getValue({
					name: 'custrecord_gw_voucher_format_code'
				});
				
				var _invoice_track = _invoice_startno.substr(0,2);
				
				_invoice_startno = _invoice_startno.replace(_invoice_track,'');				
				_invoice_endno   = _invoice_endno.replace(_invoice_track,'');
				
                var _log_invoice_startno = _invoice_track+prependZero(_invoice_startno, 8);
				if (_invoice_number_log_ary.indexOf(_log_invoice_startno)==-1) {
					var _json_ary = {
						'business_no':_business_no,
						'year_month':_year_month,
						'invoice_track':_invoice_track,					
						'start_no':_invoice_startno,
						'end_no':_invoice_endno,	
						'format_code':_egui_format_code,					
						'invoice_type':_invoice_type					
					};
					 
					_invoice_ary.push(_json_ary); 	
					
                    _invoice_number_log_ary.push(_log_invoice_startno);					
				}
				
				return true;
			}); 
			
			console.log('_invoice_ary:'+JSON.stringify(_invoice_ary)); 
			//alert('_invoice_ary='+JSON.stringify(_invoice_ary));
			
		} catch(e) {
			console.log(e.name+':'+e.message); 
		}
		 
		return _invoice_ary;
   }
   
   //help
   function add(str1, str2) {
	   var arr1 = str1.split(''),
			arr2 = str2.split(''),
			extra = false,
			sum,
			res = '';
	   while(arr1.length || arr2.length || extra) {
			sum = ~~arr1.pop() + ~~arr2.pop() + extra;
			res = sum % 10 + res;
			extra = sum > 9;
	   }
	   return res
   }
   
   ///////////////////////////////////////////////////////////////////////
   //下載檔案 
   function downloadFile(file_name, content) { 
		var _bytes = new TextEncoder().encode(content);
		var _blob = new Blob([_bytes], {
		  type: 'text/plain;charset=utf-8',
		});
		var _link = document.createElement('a');
		var _url = URL.createObjectURL(_blob);
		_link.setAttribute('href', _url);
		_link.setAttribute('download', file_name);
		_link.style.visibility = 'hidden';
		document.body.appendChild(_link);
		_link.click();
		document.body.removeChild(_link);
   }
   ///////////////////////////////////////////////////////////////////////
   //TODO E0402
   function uploadEmptyXml(business_no, year_month, empty_json_obj_ary) {		
		try {
			 //1. Get xml
             var _temp_e0402_xml = _current_record.getValue({
				   fieldId: 'custpage_e0402_xml_field'
			 }); 			
             
             var _head_business_no = getHeadBusinessNo(business_no);
			  
			 var _e0402_xml_ary = migxmlutility.getE0402Xml(_head_business_no, business_no, year_month, empty_json_obj_ary, _temp_e0402_xml);
             
			 var _error_message = '';
			 for (var i=0; i<_e0402_xml_ary.length; i++) {
				  var _e0402_xml_json_obj = _e0402_xml_ary[i];
				  
				  var _business_no   = _e0402_xml_json_obj.business_no;
				  var _year_month    = _e0402_xml_json_obj.year_month;
				  var _invoice_track = _e0402_xml_json_obj.invoice_track;
				  var _invoice_type  = _e0402_xml_json_obj.invoice_type;
				  
				  var _mig_xml = _e0402_xml_json_obj.mig_xml;
				   
				  var _api_result = sendToGateWebE0402API(_business_no, _year_month, _invoice_track, _invoice_type, _mig_xml);
			      if (_api_result.response_code != '200') {
					  _error_message += _api_result.error_message+'<br>';
				  }
			 }
			 //Show Error Message
			 var _title   = "憑證管理"; 
			 if (_error_message.length !=0) {  
				 gwmessage.showErrorMessage(_title, _error_message);  	
			 } else { 
				 var _message = "E0402上傳成功!"; 
				 gwmessage.showInformationMessage(_title, _message);  				 
			 }				 
		} catch(e) { 
		    alert(e.name+':'+e.message);
			console.log(e.name+':'+e.message); 
		}		
   }
   
   function getHeadBusinessNo(business_no) {	
	    var _head_business_no = business_no
		try {
			 //custrecord_gw_be_parent 
			var _businessSearch = search.create({
		        type: 'customrecord_gw_business_entity',
		        columns: [
		          'custrecord_gw_be_tax_id_number',
		          'custrecord_gw_be_conso_payment_code',
		          'custrecord_gw_be_sale_income_cons_parent',
		          'custrecord_gw_be_parent' 
		        ],
		        filters: ['custrecord_gw_be_tax_id_number', 'is', business_no]
		      })
		      .run()
		      .each(function (result) { 
		           var _tax_id_number      = result.getValue({name: 'custrecord_gw_be_tax_id_number'});
		           var _gw_be_sale_income_cons_parent = result.getValue({name: 'custrecord_gw_be_sale_income_cons_parent'});
		           var _gw_be_parent       = result.getValue({name: 'custrecord_gw_be_parent'});
		           var _gw_be_conso_payment_code_value = result.getValue({name: 'custrecord_gw_be_conso_payment_code'});
		           var _gw_be_conso_payment_code_text = result.getText({name: 'custrecord_gw_be_conso_payment_code'}); 
                   
		           if (_gw_be_conso_payment_code_value=='2') {
		        	   _head_business_no = _gw_be_parent;
		           }
		           //alert('_gw_be_conso_payment_code_value='+_gw_be_conso_payment_code_value+' ,_gw_be_conso_payment_code_text='+_gw_be_conso_payment_code_text)
		           return true
		      })
			 
         	  		 
		} catch(e) {  
			console.log(e.name+':'+e.message); 
		}	
		return _head_business_no
   }
   
   //TODO Call Gate API And Exception Handle
   function sendToGateWebE0402API(business_no, year_month, invoice_track, invoice_type, mig_xml) {
		var _api_result;
		var _response_code = '404';
		var _error_message = 'ERROR';
		try { 
			 alert(mig_xml)
			 
			 //TODO Call GateWeb E0402 API
			 //gwapiclient.downloadPdfs(_xmlFileObjects);
			 
			 _response_code = '404';
			 _error_message = 'GW E0402 API 尚未完成!';
			 _api_result = {
				 'response_code':_response_code,
				 'error_message': _error_message				 
			 };		     
			 			 
		} catch(e) {
			alert(e.name+':'+e.message);
			console.log(e.name+':'+e.message); 
		}
		return _api_result;
   }
   ///////////////////////////////////////////////////////////////////////
   
   function pageInit() {	   
      //預設值  
	  _current_record.setValue({
		  fieldId: 'custpage_common_unused',
		  value: true,
		  ignoreFieldChange: true
	  });	
      _current_record.setValue({
		  fieldId: 'custpage_common_used',
		  value: true,
		  ignoreFieldChange: true
	  });	
      _current_record.setValue({
		  fieldId: 'custpage_common_finished',
		  value: true,
		  ignoreFieldChange: true
	  });	
      _current_record.setValue({
		  fieldId: 'custpage_common_void',
		  value: true,
		  ignoreFieldChange: true
	  });
      //發票資料
      _current_record.setValue({
		  fieldId: 'custpage_format_code_35_07',
		  value: true,
		  ignoreFieldChange: true
	  });		
      _current_record.setValue({
		  fieldId: 'custpage_egui_electric',
		  value: true,
		  ignoreFieldChange: true
	  });		  
   }

   return {	 
      pageInit: pageInit,  
	  downloadEmptyFile: downloadEmptyFile
   };
});