/**
 * Sync Document Data Tool
 * gw_syncegui_to_document_utility.js
 *@NApiVersion 2.x
 */
define(['N/record', 
	    'N/format', 
	    'N/search', 
	    '../../gw_dao/docFormat/gw_dao_doc_format_21', 	    
	    '../../gw_dao/evidenceIssueStatus/gw_dao_evidence_issue_status_21'], 
	    function (record, format, search, doc_format_21, issue_status_21) {  
  /////////////////////////////////////////////////////////////////////////////////////////////
  function syncEguiInfoToNetsuiteDoc(voucher_main_record, document_ary) {
	log.audit({
		title: 'syncEguiInfoToNetsuiteDoc - voucher_main_record',
		details: voucher_main_record
	})
	  log.audit({
		  title: 'syncEguiInfoToNetsuiteDoc - document_ary',
		  details: document_ary
	  })
    try {
    	for (var i = 0; i < document_ary.length; i++) {
             var _document_list = document_ary[i] //INVOICE_1259998
             var _document_ary = _document_list.split('_')
             var _document_type = _document_ary.length === 3 ? _document_ary[0].toUpperCase() + '_' + _document_ary[1].toUpperCase() : _document_ary[0].toUpperCase()
             var _document_internal_id = _document_ary[_document_ary.length-1]

			 log.debug({
				 title: 'syncEguiInfoToNetsuiteDoc - before syncToNetsuiteDocument',
				 details: {
					 _document_list: _document_list,
					 _document_ary: _document_ary,
					 _document_type: _document_type,
					 _document_internal_id: _document_internal_id
				 }
			 })

             syncToNetsuiteDocument(voucher_main_record, _document_type, _document_internal_id)
    	}
 
    } catch (e) {
        log.error(e.name, e.message)
    } 
  }
  
  function syncToNetsuiteDocument(voucher_main_record, document_type, document_internal_id) { 
	log.audit({
		title: 'syncToNetsuiteDocument - params',
		details: {
			voucher_main_record: voucher_main_record,
			document_type: document_type,
			document_internal_id: document_internal_id
		}
	})
    try { 
    	var _record_type_id = ''
    	if (document_type == 'INVOICE') {
    		_record_type_id = record.Type.INVOICE		              
        } else if (document_type == 'CREDITMEMO') {
        	_record_type_id = record.Type.CREDIT_MEMO	
        } else if (document_type == 'CASH_SALE') {
        	_record_type_id = record.Type.CASH_SALE		               
        } else if (document_type == 'CUSTOMER_DEPOSIT') {
        	_record_type_id = record.Type.CUSTOMER_DEPOSIT		               
        }
    	
    	var _document_record = record.load({
    	      type: _record_type_id,
    	      id: document_internal_id,
    	      isDynamic: true,
    	})
    	 	
    	var _gw_gui_format   = _document_record.getValue({fieldId: 'custbody_gw_gui_format'}) 
    	var _gw_gui_tax_type = _document_record.getValue({fieldId: 'custbody_gw_gui_tax_type'}) 
    	log.debug('syncToNetsuiteDocument format', 'record_type_id='+_record_type_id+',gw_gui_format='+_gw_gui_format+',gw_gui_tax_type='+_gw_gui_tax_type)
    	
    	//有資料就不再更新
        //if (_gw_gui_format.trim().length==0 && _gw_gui_tax_type.trim().length==0 && _record_type_id.length !=0) {
	    	var values = {} 
	    	//_access_model NETSUITE / GATEWEB
	    	var _access_model = voucher_main_record.getValue({fieldId: 'custrecord_gw_upload_access_model'}) 
	    	
	    	//應稅銷售額
	    	var _gui_sales_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_sales_amount'})
	    	//稅額
	    	var _gui_tax_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_amount'})
	    	//總計
	    	var _gui_total_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_total_amount'})
	    	if (_access_model=='GATEWEB') {
	    		_gui_total_amt = (parseFloat(_gui_total_amt)-parseFloat(_gui_tax_amt)).toString()
	    		//稅率 tax_rate = 0.05
	    		var _tax_rate = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_rate'})
	    		_gui_tax_amt = Math.round(parseFloat(_sales_amount) * parseFloat(_tax_rate)).toString()
	    		
	    		_gui_total_amt = (parseFloat(_gui_total_amt)+parseFloat(_gui_tax_amt)).toString()  
	    	} 
	    	//稅額
	  	    values['custbody_gw_gui_tax_amt'] = _gui_tax_amt.toString()
	  	    //發票期別
		    values['custbody_gw_gui_tax_file_date'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_yearmonth'}) 
		    //稅率  
		    values['custbody_gw_gui_tax_rate'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_rate'})	
		    //課稅別  
		    values['custbody_gw_gui_tax_type'] = getTaxTypeIdByValue(voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_type'}))	
	        //發票號碼訖號-custbody_gw_gui_num_end
		    //發票號碼起號-custbody_gw_gui_num_start
		    
		    //總計
		    values['custbody_gw_gui_total_amt'] = _gui_total_amt.toString()
		    //發票日期  
		    var _gw_voucher_date = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_date'})
	        values['custbody_gw_gui_date'] = convertStringToDate(_gw_voucher_date.toString())
		    //發票不上傳
		    if (_need_upload_egui_mig=='NONE') values['custbody_gw_gui_not_upload'] = true 
		    //應稅銷售額
		    values['custbody_gw_gui_sales_amt'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_sales_amount'}).toString()
		    //免稅銷售額	
		    values['custbody_gw_gui_sales_amt_tax_exempt'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_free_sales_amount'}).toString()
		    //零稅銷售額 
		    values['custbody_gw_gui_sales_amt_tax_zero'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_zero_sales_amount'}).toString()
		    //發票部門
		    values['custbody_gw_gui_department'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_dept_code'}) 
		    //發票分類
		    values['custbody_gw_gui_class'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_classification'}) 
		    //營業稅申報期別  
		    values['custbody_gw_gui_apply_period'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_yearmonth'})  
		    
		    //開立狀態   
		    var _gw_voucher_status = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_status'})
		    var _gw_voucher_upload_status = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_upload_status'})
		    var _need_upload_egui_mig = voucher_main_record.getValue({fieldId: 'custrecord_gw_need_upload_egui_mig'})
		        	    
		    values['custbody_gw_evidence_issue_status'] = getGwEvidenceStatus(_gw_voucher_status, _gw_voucher_upload_status, _need_upload_egui_mig)
		    //憑證格式代號 
		    var _mof_code = voucher_main_record.getValue({fieldId: 'custrecord_gw_invoice_type'})
		    var _format_code = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_format_code'})
		    log.debug('custbody_gw_gui_format', 'mof_code='+_mof_code+',format_code='+_format_code)
		    
		    var _gw_gui_format_obj = doc_format_21.getByValueAndMofCode(_format_code, _mof_code)
		    if(_gw_gui_format_obj!=null)values['custbody_gw_gui_format'] = _gw_gui_format_obj.id
		 
		    log.debug('custbody_gw_gui_format', 'custbody_gw_gui_format='+JSON.stringify(values))
		    
		    //通關注記 
		    var _clearance_mark = voucher_main_record.getValue({fieldId: 'custrecord_gw_clearance_mark'})
	    	if (_clearance_mark!='') {
	    	    values['custbody_gw_egui_clearance_mark'] = getCustomClearanceMarkByValue(_clearance_mark)
		    }
	  	    log.debug('record.submitFields', 'record_type_id='+_record_type_id+' ,document_internal_id='+document_internal_id)
		  
	 	    var _id = record.submitFields({
	            type: _record_type_id,
	            id: document_internal_id,
	            values: values,
	            options: {
	              enableSourcing: false,
	              ignoreMandatoryFields: true
	            }
	        })
	        log.debug('record.submitFields', 'saved success'+_record_type_id+' ,document_internal_id='+document_internal_id)
			  
	        
	    //}
    } catch (e) {
        log.error(e.name, e.message)
    } 
  }
  
  //YYYYMMDD TO DATE
  function convertStringToDate(date_str) {   
	 //log.debug('convertStringToDate', 'date_str='+date_str) 	 
	 var _year  = parseInt(date_str.substring(0, 4)) 
	 var _month = parseInt(date_str.substring(4, 6))-1
	 var _day   = parseInt(date_str.substring(6, 8))
	    
	 return new Date(_year,_month,_day) 
  }	
  
  function getGwEvidenceStatus(gw_voucher_status, voucher_upload_status, need_upload_egui_mig) {   	
	var _gw_evidence_status_id = -1
	
	  log.debug('getGwEvidenceStatus', 'gw_voucher_status='+gw_voucher_status+',voucher_upload_status='+voucher_upload_status+',need_upload_egui_mig='+need_upload_egui_mig)
	   
    try {      	
    	 var _gw_evidence_status = ''
    	 if (gw_voucher_status.toUpperCase().indexOf('CANCEL') !=-1) {
    		 //CE	憑證作廢上傳已失敗
        	 //CC	憑證作廢上傳已成功
        	 //CP	憑證作廢已上傳
        	 //CI	憑證作廢待審核
        	 //CA	憑證已作廢
        	 //PC	憑證已作廢, 未進入關網系統
    		 /**
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status ='PC'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ISSUE') !=-1) {
    			 _gw_evidence_status ='CI'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_APPROVE') !=-1) {
    			 _gw_evidence_status ='CP'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_UPLOAD') !=-1) {
    			 _gw_evidence_status ='CP'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_SUCCESS') !=-1) {
    			 _gw_evidence_status ='CC'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ERROR') !=-1 ||
    				    voucher_upload_status =='E') {
    			 _gw_evidence_status ='CE'
    		 }
    		 */
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status ='PC' 
    		 } else  {
    			 if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ISSUE') !=-1) {
        			 _gw_evidence_status ='CI'
        		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_APPROVE') !=-1) {
        			 _gw_evidence_status ='CP'
        		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_UPLOAD') !=-1) {
        			 _gw_evidence_status ='CP'
        		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_SUCCESS') !=-1) {
        			 _gw_evidence_status ='CC'
        		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ERROR') !=-1 ||
        				    voucher_upload_status =='E') {
        			 _gw_evidence_status ='CE'
        		 }
    		 }
    			 
    	 } else {
    		 //A	憑證已開立
        	 //PA	憑證已開立, 未進入關網系統
        	 //I	憑證未開立
        	 //IE	憑證開立上傳已失敗
        	 //IC	憑證開立上傳已成功
        	 //IP	憑證開立已上傳 
    		 /**
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status = 'PA'
    		 } else if (voucher_upload_status == 'A') {
    			 _gw_evidence_status = voucher_upload_status
    		 } else { 
    			 _gw_evidence_status = 'I'+voucher_upload_status
    		 }
    		 */
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status = 'PA' 
    		     //NE-338
    			 if (voucher_upload_status == 'C')_gw_evidence_status = 'I'+voucher_upload_status
    		 } else {
    			 if (voucher_upload_status == 'A') {
        			 _gw_evidence_status = voucher_upload_status
        		 } else { 
        			 _gw_evidence_status = 'I'+voucher_upload_status
        		 }
    		 }
    		 
    	 } 
    	 log.debug('issue_status_21.getByStatusCode', 'gw_evidence_status='+_gw_evidence_status)
    	 var _obj = issue_status_21.getByStatusCode(_gw_evidence_status)
    	 _gw_evidence_status_id = _obj.id
    	 
    } catch (e) {
        log.error(e.name, e.message)
    } 
    
    return _gw_evidence_status_id
  }
  
  //voucher_status = [VOUCHER_SUCCESS, CANCELL_APPROVE]
  function syncEguiUploadStatusToNSEvidenceStatus(voucher_status, voucher_upload_status, need_upload_egui_mig, voucher_main_internalid_ary) {  	
	  log.debug('syncEguiUploadStatusToNSEvidenceStatus', 'voucher_status='+voucher_status+',voucher_upload_status='+voucher_upload_status)
	  try { 
    	 if (voucher_main_internalid_ary.length !=0) {
    		 var _my_search = search.load({
   			     id: 'customsearch_gw_voucher_main_search',
   		     }) 
   		     
   		     var _filter_array = [] 
    		 _filter_array.push(['internalId', search.Operator.ANYOF, voucher_main_internalid_ary]) 
  		     _my_search.filterExpression = _filter_array
  		   
  		     _my_search.run().each(function(result) {		 
  		    	 var _result = JSON.parse(JSON.stringify(result)) 
  		    	  
  		    	 var _voucher_type             = _result.values.custrecord_gw_voucher_type //EGUI, ALLOWANCE
  		    	 var _ns_document_type         = _result.values['CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type'].toUpperCase()
  		    	 var _ns_document_apply_id_obj = _result.values['CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_apply_id']
  		    	 var _ns_document_apply_id     = _ns_document_apply_id_obj[0].value
  		    	 
  		    	 var _evidence_status_id       = getGwEvidenceStatus(voucher_status, voucher_upload_status, need_upload_egui_mig)
  			  
  		    	 var _record_type_id = ''
		    	 if (_ns_document_type == 'INVOICE') {
		    		 _record_type_id = record.Type.INVOICE		              
		         } else if (_ns_document_type == 'CREDITMEMO') {
		        	 _record_type_id = record.Type.CREDIT_MEMO	
		         } else if (_ns_document_type == 'CASH_SALE') {
		        	 _record_type_id = record.Type.CASH_SALE		               
		         } else if (_ns_document_type == 'CUSTOMER_DEPOSIT') {
		        	 _record_type_id = record.Type.CUSTOMER_DEPOSIT		               
		         }
  		    	 
  		    	 var values = {}   
  		  	     values['custbody_gw_evidence_issue_status'] = _evidence_status_id
  		  	     log.debug('ns_document_apply_id result', 'ns_document_apply_id='+_ns_document_apply_id+' ,evidence_status_id='+_evidence_status_id)
  		  	     
  		    	 var _id = record.submitFields({
  		             type: _record_type_id,
  		             id: _ns_document_apply_id,
  		             values: values,
  		             options: {
  		               enableSourcing: false,
  		               ignoreMandatoryFields: true
  		             }
  		         })
  		    	 
  			     return true;
  		     })	   		     
    	 }
 
    } catch (e) {
        log.error(e.name, e.message)
    } 
  }
  
  
  function getCustomClearanceMarkByValue(clearance_mark) {  	
	  log.debug('getCustomClearanceMarkByValue', 'clearance_mark='+clearance_mark)
	  var _internal_id=-1
	  try { 
		  var _search = search.create({
		      type: 'customrecord_gw_ap_doc_custom_option',
		      columns: [
		        search.createColumn({ name: 'custrecord_gw_ap_doc_custom_value' }),
		        search.createColumn({ name: 'custrecord_gw_ap_doc_custom_text' }) 
		      ]
		  })
		  
		  var _filter_array = [] 
    	  _filter_array.push(['custrecord_gw_ap_doc_custom_value', search.Operator.EQUALTO, parseInt(clearance_mark)]) 
  		  _search.filterExpression = _filter_array
  		  log.debug('CustomClearanceMarkByValue', '_filter_array='+JSON.stringify(_filter_array))
  		  _search.run().each(function(result) {	
  			  _internal_id=result.id
  			  var _gw_ap_doc_custom_value = result.getValue({
  		          name: 'custrecord_gw_ap_doc_custom_value'
  		      })
  		      var _ap_doc_custom_text = result.getValue({
  		          name: 'custrecord_gw_ap_doc_custom_text'
  		      })
  		        
  			  log.debug('CustomClearanceMarkByValue _internal_id', '_internal_id='+_internal_id)
  			
  			  return true
		  })	   
 
    } catch (e) {
        log.error(e.name, e.message)
    } 
    log.debug('getCustomClearanceMarkByValue', '_internal_id='+_internal_id)
    return _internal_id
  }
  
  function getTaxTypeIdByValue(value) {  	
	  log.debug('getTaxTypeIdByValue', 'value='+value)
	  var _internal_id=-1
	  try { 
		  var _search = search.create({
		      type: 'customrecord_gw_ap_doc_tax_type_option',
		      columns: [
		        search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_value' }),
		        search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_text' }) 
		      ]
		  })
		  
		  var _filter_array = [] 
    	  _filter_array.push(['custrecord_gw_ap_doc_tax_type_value', search.Operator.EQUALTO, parseInt(value)]) 
  		  _search.filterExpression = _filter_array
  		  log.debug('getTaxTypeIdByValue', '_filter_array='+JSON.stringify(_filter_array))
  		  _search.run().each(function(result) {	
  			  _internal_id=result.id 
  			  return true
		  })	   
 
    } catch (e) {
        log.error(e.name, e.message)
    } 
    log.debug('getTaxTypeIdByValue', 'internal_id='+_internal_id)
    return _internal_id
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  return {
	  syncEguiInfoToNetsuiteDoc: syncEguiInfoToNetsuiteDoc, 
	  syncEguiUploadStatusToNSEvidenceStatus: syncEguiUploadStatusToNSEvidenceStatus,
	  getGwEvidenceStatus: getGwEvidenceStatus
  }
})