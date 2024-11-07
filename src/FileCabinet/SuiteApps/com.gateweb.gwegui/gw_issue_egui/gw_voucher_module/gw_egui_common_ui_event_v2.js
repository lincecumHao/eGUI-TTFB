/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/search',
  'N/currentRecord',
  'N/record',
  'N/url',
  '../../gw_print/gw_download_pdf/gw_api_client',      
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_migxml_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_gwmessage_utility',
  '../../library/gw_date_util'
], function (
  search,
  currentRecord,
  record,
  url,
  gwapiclient,   
  gwconfigure,
  dateutility,
  stringutility,
  migxmlutility,
  invoiceutility,
  gwmessage,
  gwDateUtil
) {
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()
  var _gwDepositVoucherRecordId = gwconfigure.getGwDepositVoucherRecord()

  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
  var _invoce_control_field_value = gwconfigure.unLockInvoceControlFieldId()

  var _currentRecord = currentRecord.get()
  var _voucherIdArray = [-1]

  function fieldChanged(context) {
    if (window.onbeforeunload) {
      //avoid change warning
      window.onbeforeunload = function () {
        null
      }
    }
    /**
    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)
    if (_changeFieldId == 'custpage_status') {
    }
    */
  }

  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
    //alert('changedSubListId='+changedSubListId);
    var changeLineId = _currentRecord.getCurrentSublistIndex({
      sublistId: changedSubListId,
    })
    console.log('changeLineId=' + changeLineId)
    //vouchersublistid
    //處理 Invoice
    if (changedSubListId == 'vouchersublistid') {
      var _checkedResult = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_voucher_check_id',
      })
      var _selectCheckId = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_voucher_id',
      })
      console.log(
        'checkedResult=' + _checkedResult + ', selectCheckId=' + _selectCheckId
      )
      if (_checkedResult) {
        //add to array
    	if(_voucherIdArray.toString().indexOf(_selectCheckId)==-1){
    	   _voucherIdArray.push(_selectCheckId)
    	}  
      } else {
        //remove from array
        for (var i = 0; i <= _voucherIdArray.length; i++) {
          if (_voucherIdArray[i] === _selectCheckId) {
            _voucherIdArray.splice(i, 1)
          }
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_voucher_hiddent_listid',
        value: _voucherIdArray.toString(),
        ignoreFieldChange: true,
      })
    }

    console.log('_voucherIdArray=' + _voucherIdArray)
  }

  function searchResults() {
    _currentRecord.setValue({
      fieldId: 'custpage_hiddent_buttontype',
      value: 'search',
      ignoreFieldChange: true,
    })

    document.forms[0].submit()
  }

  //取得欄位值
  function getSublistColumnValue(sublistId, keyfieldId, fieldId, internalId) {
    console.log(
      'GetSublistColumnValue sublistId= ' +
        sublistId +
        ' , fieldId=' +
        fieldId +
        '  ,internalId=' +
        internalId
    )
    var _entityId = 0
    try {
      var _numLines = _currentRecord.getLineCount({
        sublistId: sublistId,
      })

      //customer_search_voucher_id
      for (var i = 0; i < _numLines; i++) {
        var _id = _currentRecord.getSublistValue({
          sublistId: sublistId,
          fieldId: keyfieldId,
          line: i,
        })

        if (_id === internalId) {
          _entityId = _currentRecord.getSublistValue({
            sublistId: sublistId,
            fieldId: fieldId,
            line: i,
          })
          break
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _entityId
  }

  //檢查客戶代碼不可重複
  function validateCancelTask(voucher_open_type) {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      var _voucherSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })

      var _voucherIdAry = _voucherSelectedIds.split(',')

      if (_voucherIdAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取作廢憑證資料!'
      } else {
    	var _manual_egui_voucher_ary = [];//紀錄歷史發票
        //check selected items
        var _checkDocumentIndexId = ''
        for (var i = 0; i < _voucherIdAry.length; i++) {
          var _internalId = _voucherIdAry[i]

          if (parseInt(_internalId) > 0) {
            //取得 sublist 的 entityid(客戶代碼)
            var _voucher_number = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_number',
              _internalId
            )
            //20201115 23:59:59
            var _voucher_date = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_date',
              _internalId
            )
            var _yearmonth = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_yearmonth',
              _internalId
            )
            var _discounted = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_discounted',
              _internalId
            )
            var _upload_status = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_upload_status',
              _internalId
            )
            //VOUCHER_SUCCESS
            var _voucher_status = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_status',
              _internalId
            )
            var _relate_number = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_relate_number',
              _internalId
            )
            
            var _manual_egui_id  = getSublistColumnValue('vouchersublistid', 'customer_search_voucher_id', 'customer_voucher_manual_egui_id', _internalId);
                	              
            var _need_upload_egui_mig  = getSublistColumnValue('vouchersublistid', 'customer_search_voucher_id', 'customer_need_upload_egui_mig', _internalId);
						
            /**
               if (stringutility.trim(_voucher_status) != 'VOUCHER_SUCCESS' ||
               stringutility.trim(_upload_status) != 'C'){
							if (voucher_open_type.indexOf('ALLOWANCE') !=-1) {
								_error_message = ']:折讓單-開立成功才可作廢!';
							} else if (voucher_open_type.indexOf('EGUI') !=-1) {
								_error_message = ']:發票-開立成功才可作廢!';
							}
							
							_error_message = '['+_voucher_number+_error_message;
							_checkFlag = false;  
							break;
						}
               if (voucher_open_type.indexOf('EGUI') !=-1 && stringutility.trim(_discounted) !== ''){
							_error_message = '['+_voucher_number+']:有折讓單不可作廢!';
							_checkFlag = false;  
							break;
						}
               */
            //20201113 walter modify
            /**
            if (dateutility.checkVoucherEffectiveDate(_voucher_date) == false) {
              _error_message = ']:憑證-已超過報稅期不可作廢!'
              _error_message = '[' + _voucher_number + _error_message
              _checkFlag = false
              break
            }
            */       
            if (_voucher_number.trim().length == 0) {
                _error_message = ']:憑證-無號碼不可作廢憑證,請執行失敗解鎖!'
                _error_message = '[' + _voucher_number + _error_message
                _checkFlag = false
                break
            }
            
            if (_need_upload_egui_mig != 'NONE' && 
			    dateutility.checkVoucherEffectiveDate(_voucher_date)==false) {
				_error_message = ']:憑證-已超過報稅期不可作廢!';
				_error_message = '['+_voucher_number+_error_message;
				_checkFlag = false;  
				break;
			}

            //作廢行為檢查
            if (voucher_open_type.indexOf('EGUI') != -1) {
                //發票作廢規則檢查
	        	if (_need_upload_egui_mig == 'NONE') {
					//不上傳規則
					if (stringutility.trim(_discounted) !== '' && _manual_egui_id==true) {
						//檢查歷史發票是否真的被折
						//checkAllowanceOfEguiVoucher TODO
						_manual_egui_voucher_ary.push(_voucher_number);
					} else if (stringutility.trim(_voucher_status).indexOf('CANCEL') != -1) {
						_error_message = '['+_voucher_number+']:已申請作廢!';
						_checkFlag = false;  
						break;
					} else if (stringutility.trim(_discounted) !== '' && _manual_egui_id==false) {
						_error_message = '['+_voucher_number+']:有折讓單不可作廢!';
						_error_message = '['+_voucher_number+_error_message;
						_checkFlag = false;  
						break;
					}	
				} else {
					if (stringutility.trim(_voucher_status) != 'VOUCHER_SUCCESS' ||
						stringutility.trim(_upload_status) == 'A' ||
						stringutility.trim(_upload_status) == 'P' ||
						stringutility.trim(_upload_status) == 'E' ||
						stringutility.trim(_upload_status) == 'D') {
						_error_message = ']:發票-需上傳後或開立成功才可作廢!';
						_error_message = '['+_voucher_number+_error_message;
						_checkFlag = false;  
						break;
					} else if (stringutility.trim(_discounted) !== '') {
						_error_message = '['+_voucher_number+']:有折讓單不可作廢!';
						_error_message = '['+_voucher_number+_error_message;
						_checkFlag = false;  
						break;
					}	
				} 
            } else if (
              voucher_open_type.indexOf('ALLOWANCE') != -1 &&
              stringutility.trim(_voucher_status).indexOf('CANCEL') != -1
            ) {
              //折讓單規則檢查=>進入作廢申請程序
              _error_message = ']:折讓單-作廢已處理不可再次作廢!'
              _error_message = '[' + _voucher_number + _error_message
              _checkFlag = false
              break
            }

            //檢查CUSTOMER_DEPOSIT是否已扣抵
            if (_relate_number.indexOf('CUSTOMER_DEPOSIT') != -1) {
              //TODO
              //alert('_relate_number='+_relate_number.indexOf('CUSTOMER_DEPOSIT'));
              if (
                checkCustomerDepositBalanceAmountIsZero(_internalId) == false
              ) {
                _error_message = '[' + _voucher_number + ']:已扣抵不可作廢!'
                _checkFlag = false
                break
              }
            }
          }
        }
        //檢查歷史發票是否真的被折			   
	    if (_manual_egui_voucher_ary.length !=0 && _error_message.length == 0) {
		    _error_message = checkAllowanceOfEguiVoucher(_manual_egui_voucher_ary);
		    if (_error_message.length != 0) _checkFlag = false; 
	    }
      }
      _jsonResult = {
        checkflag: _checkFlag,
        message: _error_message,
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _jsonResult
  }
  
  //檢查歷史發票是否真的被折
  function checkAllowanceOfEguiVoucher(manual_egui_voucher_ary) {	 
     var _error_message = '';
	  try {
		   var _mySearch = search.load({
			  id: 'customsearch_gw_voucher_main_search',
		   }) 
		   
		   var _filterArray = [];  
		   _filterArray.push(['custrecord_gw_voucher_type', search.Operator.IS, 'ALLOWANCE']);
		   _filterArray.push('and');  
		   _filterArray.push(['custrecord_gw_voucher_status', search.Operator.IS, 'VOUCHER_SUCCESS']);
		   _filterArray.push('and');  
		   _filterArray.push(['custrecord_gw_voucher_upload_status', search.Operator.IS, 'C']);
		   _filterArray.push('and'); 
		   
		   var _subFilterArray = [];  
		   for(var i=0; i<manual_egui_voucher_ary.length; i++) {
				 var _gui_number = manual_egui_voucher_ary[i];
				 if (i!=0) _subFilterArray.push('or');	
				 _subFilterArray.push(['custrecord_gw_original_gui_number', search.Operator.IS, _gui_number]);
		   }	 
		   if (_subFilterArray !=0)_filterArray.push(_subFilterArray); 
		   
		   _mySearch.filterExpression = _filterArray; 
		  
		   var _error_original_gui_number = '';
		   _mySearch.run().each(function(result) {		 
			  var _original_gui_number = result.getValue({name: 'custrecord_gw_original_gui_number'});  
			  _error_original_gui_number += _original_gui_number+','; 
			  
			  return true;
		   });	
		   if (_error_original_gui_number.length !=0) {
              _error_message = ']:歷史發票已有折讓單扣抵!';
			   _error_message = '['+_error_original_gui_number+_error_message;
		   }	  
	  } catch (e) {
		  console.log(e.name+':'+e.message);  
	  }
	  return _error_message;
  }

  function checkCustomerDepositBalanceAmountIsZero(mainId) {
    var _has_data = true
    try {
      var _mySearch = search.create({
        type: _gwDepositVoucherRecordId,
        columns: [
          search.createColumn({ name: 'custrecord_gw_assign_document_id' }),
          search.createColumn({ name: 'custrecord_gw_deposit_egui_tax_type' }),
          search.createColumn({ name: 'custrecord_gw_assign_document_number' }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_tax_amount',
          }),
          search.createColumn({ name: 'custrecord_gw_deposit_egui_amount' }),
          search.createColumn({
            name: 'custrecord_gw_deposit_dedcuted_amount',
          }),
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_deposit_voucher_status',
        search.Operator.IS,
        'C',
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_deposit_voucher_main_id',
        search.Operator.EQUALTO,
        parseInt(mainId),
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_deposit_dedcuted_amount',
        search.Operator.NOTEQUALTO,
        0,
      ])

      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        _has_data = false
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _has_data
  }

  function printPaperSelected() {
    try {
      var _title = '憑證列印管理'

      var _checkJsonObject = validatePrintXml()
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag == true) {
        _currentRecord.setValue({
          fieldId: 'custpage_hiddent_buttontype',
          value: 'printPaper',
          ignoreFieldChange: true,
        })

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
        return
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //重傳資料-Start
  //重傳資料-End
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //刪除及還原資料-Start
  function unLockSelected() {
    try {
      var _title = '憑證管理'

      var _checkJsonObject = validateUnLockTask()
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag == true) {
        _currentRecord.setValue({
          fieldId: 'custpage_hiddent_buttontype',
          value: 'unLockSelected',
          ignoreFieldChange: true,
        })

        //document.forms[0].submit();
        var voucher_list_id = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })

        unLockVoucher(voucher_list_id)

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
        return
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function unLockVoucher(voucher_list_id) {
    //1.delete details
    //2.delete main
    //3.delete apply
    try {
      var _internalIdAry = voucher_list_id.split(',')
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var _invoice_id_ary = []
      var _creditmemo_id_ary = []
      var _sales_order_id_ary = []

      var _detailSearch = search.create({
        type: _voucher_details_record,
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({
            name: 'custrecord_gw_voucher_main_internal_id',
          }),
          search.createColumn({ name: 'custrecord_gw_ns_document_type' }),
          search.createColumn({ name: 'custrecord_gw_dtl_item_tax_code' }),
          search.createColumn({ name: 'custrecord_gw_item_amount' }),
          search.createColumn({ name: 'custrecord_gw_ns_document_apply_id' }), //846
        ],
      })
      var _filterArray = []

      for (var i = 0; i < _internalIdAry.length; i++) {
        var _id = _internalIdAry[i]
        if (i != 0) _filterArray.push('or')
        _filterArray.push([
          'custrecord_gw_voucher_main_internal_id',
          search.Operator.IS,
          _id,
        ])
      }
      _detailSearch.filterExpression = _filterArray

      _detailSearch.run().each(function (result) {
        var _internalid = result.getValue({
          name: 'internalid',
        })
        var _ns_document_type = result.getValue({
          name: 'custrecord_gw_ns_document_type',
        })
        var _ns_document_apply_id = result.getValue({
          name: 'custrecord_gw_ns_document_apply_id',
        })
        var _ns_item_tax_code = result.getValue({
          name: 'custrecord_gw_dtl_item_tax_code',
        })
        var _item_amount = result.getValue({
          name: 'custrecord_gw_item_amount',
        })

        if (_ns_document_type == 'INVOICE') {
          var _aryString = _invoice_id_ary.toString()
          if (_aryString.indexOf(_ns_document_apply_id) == -1) {
            _invoice_id_ary.push(_ns_document_apply_id)
          }
        } else if (_ns_document_type == 'CREDITMEMO') {
          var _aryString = _creditmemo_id_ary.toString()
          if (_aryString.indexOf(_ns_document_apply_id) == -1) {
            _creditmemo_id_ary.push(_ns_document_apply_id)
          }
        } else if (_ns_document_type == 'SALES_ORDER') {
          var _aryString = _sales_order_id_ary.toString()
          if (_aryString.indexOf(_ns_document_apply_id) == -1) {
            _sales_order_id_ary.push(_ns_document_apply_id)
          }
        }

        return true
      })
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Un Locked Main
      for (var i = 0; i < _internalIdAry.length; i++) {
        var _internalid = _internalIdAry[i]

        if (parseInt(_internalid) > 0) {
          var values = {}
          values['custrecord_gw_voucher_status'] = 'VOUCHER_UNLOCKED'
          values['custrecord_gw_lock_transaction'] = false
          var _id = record.submitFields({
            type: _voucher_main_record,
            id: parseInt(_internalid),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //un lock invoice egui start and end number
      if (_invoice_id_ary.length != 0) {
        for (var i = 0; i < _invoice_id_ary.length; i++) {
          var _internalid = _invoice_id_ary[i]
          //unlock
          var values = {}
          values[_invoce_control_field_id] = false
          values['custbody_gw_gui_num_start'] = ''
          values['custbody_gw_gui_num_end'] = ''
          values['custbody_gw_allowance_num_start'] = ''
          values['custbody_gw_allowance_num_end'] = ''

          var _id = record.submitFields({
            type: search.Type.INVOICE,
            id: parseInt(_internalid),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }

      if (_creditmemo_id_ary.length != 0) {
        for (var i = 0; i < _creditmemo_id_ary.length; i++) {
          var _internalid = _creditmemo_id_ary[i]
          //unlock
          var values = {}
          values[_invoce_control_field_id] = false
          //values['custbody_gw_gui_num_start'] = ''
          //values['custbody_gw_gui_num_end'] = ''
          values['custbody_gw_allowance_num_start'] = ''
          values['custbody_gw_allowance_num_end'] = ''

          var _id = record.submitFields({
            type: search.Type.CREDIT_MEMO,
            id: parseInt(_internalid),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }
  

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //回復不上傳-Start
  function resetSelected() {
    try {
      var _title = '憑證管理'

      var _checkJsonObject = validateUnLockTask()
      
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag == true) {
        _currentRecord.setValue({
          fieldId: 'custpage_hiddent_buttontype',
          value: 'resetSelected',
          ignoreFieldChange: true,
        })
 
        var voucher_list_id = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })

        resetVoucherMainStatus(voucher_list_id)

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
        return
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }
  
  function resetVoucherMainStatus(voucher_list_id) { 
    try {
	     var _internal_id_ary = voucher_list_id.split(',')
	     //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	     for (var i = 0; i < _internal_id_ary.length; i++) {
	          var _id = parseInt(_internal_id_ary[i])
	          if (_id>0) {
	        	  var values = {}
	              values['custrecord_gw_voucher_status'] = 'VOUCHER_SUCCESS'
	              values['custrecord_gw_voucher_upload_status'] = 'A'
	              //values['custrecord_gw_need_upload_egui_mig'] = 'NONE'
	              //NE-338
	              values['custrecord_gw_need_upload_egui_mig'] = 'RETRIEVE'	  
	           	  values['custrecord_gw_uploadstatus_messag'] = ''
	              var _id = record.submitFields({
	                type: 'customrecord_gw_voucher_main',
	                id: _id,
	                values: values,
	                options: {
	                  enableSourcing: false,
	                  ignoreMandatoryFields: true,
	                },
	              })
	          }
	     
	     }  
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////

  //返還Customer Deposit金額
  function checkDepositVoucherRecordAndReturnAmount(
    _assign_document_id,
    deposit_sales_amount,
    deposit_zero_amount,
    deposit_free_amount
  ) {
    try {
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //1.Search
      var _mySearch = search.create({
        type: _deposit_voucher_record,
        columns: [
          search.createColumn({ name: 'custrecord_gw_deposit_egui_tax_type' }),
          search.createColumn({ name: 'custrecord_gw_deposit_egui_amount' }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_tax_amount',
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_total_amount',
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_dedcuted_amount',
          }),
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_assign_document_type',
        search.Operator.IS,
        'SALES_ORDER',
      ])
      _filterArray.push([
        'custrecord_gw_assign_document_id',
        search.Operator.EQUALTO,
        parseInt(_assign_document_id),
      ])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        var _internalid = result.id

        var _deposit_egui_tax_type = result.getValue({
          name: 'custrecord_gw_deposit_egui_tax_type',
        })
        var _deposit_egui_amount = result.getValue({
          name: 'custrecord_gw_deposit_egui_amount',
        })
        var _deposit_egui_tax_amount = result.getValue({
          name: 'custrecord_gw_deposit_egui_tax_amount',
        })
        var _deposit_dedcuted_amount = result.getValue({
          name: 'custrecord_gw_deposit_dedcuted_amount',
        })

        var _return_amount = stringutility.convertToFloat(
          _deposit_dedcuted_amount
        )
        if (_deposit_egui_tax_type == '1') {
          _return_amount -= deposit_sales_amount
        } else if (_deposit_egui_tax_type == '2') {
          //零稅
          _return_amount -= deposit_zero_amount
        } else if (_deposit_egui_tax_type == '3') {
          //免稅
          _return_amount -= deposit_free_amount
        }

        var values = {}
        values['custrecord_gw_deposit_dedcuted_amount'] = _return_amount
        var _id = record.submitFields({
          type: _deposit_voucher_record,
          id: _internalid,
          values: values,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        })

        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
  }

  //刪除及還原資料-End
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  function validatePrintXml() {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      var _voucherSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      var _voucherIdAry = _voucherSelectedIds.split(',')

      if (_voucherIdAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取列印憑證資料!'
      } else {
        //check selected items
        var _checkDocumentIndexId = ''
        for (var i = 0; i < _voucherIdAry.length; i++) {
          var _internalId = _voucherIdAry[i]

          if (parseInt(_internalId) > 0) {
            //取得 sublist 的 entityid(客戶代碼)
            var _voucher_number = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_number',
              _internalId
            )
            var _isprinted = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_isprinted',
              _internalId
            )
            //先不檔
            /**
               if (stringutility.trim(_isprinted) == 'Y'){
							_error_message += '['+_voucher_number+']'+'已列印過不可選取!';
							_checkFlag = false;   
						}
               */
          }
        }
      }
      _jsonResult = {
        checkflag: _checkFlag,
        message: _error_message,
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _jsonResult
  }

  function validateUnLockTask() {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      var _voucherSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      var _voucherIdAry = _voucherSelectedIds.split(',')

      if (_voucherIdAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取解鎖憑證資料!'
      } else {
        //check selected items
        var _checkDocumentIndexId = ''
        for (var i = 0; i < _voucherIdAry.length; i++) {
          var _internalId = _voucherIdAry[i]

          if (parseInt(_internalId) > 0) {
            //取得 sublist 的 entityid(客戶代碼)
            var _voucher_number = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_number',
              _internalId
            )
            var _upload_status = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_upload_status',
              _internalId
            )
            var _voucher_status = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_status',
              _internalId
            )
            //alert('_internalId='+_internalId+', _upload_status='+_upload_status+', _voucher_status='+_voucher_status);
            if (stringutility.trim(_upload_status) != 'E') {
              _error_message =
                '[' + _voucher_number + ']' + '不可選取非錯誤憑證!'
              _checkFlag = false
            } else if (_voucher_status == 'VOUCHER_UNLOCKED') {
              _error_message = '[' + _voucher_number + ']' + '該憑證已 UNLOCKED!'
              _checkFlag = false
            }
          }
        }
      }
      _jsonResult = {
        checkflag: _checkFlag,
        message: _error_message,
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _jsonResult
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  //Gen XML Function-Start
  function printPDFSelected(voucher_type, printType) {
    try {
      var voucher_list_id = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
	  //是否含下載錯誤資料PDF
	  var _select_error_item = _currentRecord.getValue({
			fieldId: 'custpage_select_error_item'
	  });   
	  console.log('select_error_item', _select_error_item); 
	    
      if (voucher_list_id == '') {
        var _pre_text = '電子發票'
        if (voucher_type == 'EGUI') {
          _pre_text = '電子發票'
        } else if (voucher_type == 'ALLOWANCE') {
          _pre_text = '折讓(電子發票)'
        }

        var _title = _pre_text + '-下載PDF管理'
        var _message = '請選取' + _pre_text + '-下載PDF資料'

        if (printType == 'PAPER') {
          _title = _pre_text + '-列印管理'
          _message = '請選取' + _pre_text + '-列印資料'
        }

        gwmessage.showErrorMessage(_title, _message)
        return
      }

      var _b2bs_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2bs_xml_field',
      })
      var _b2be_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2be_xml_field',
      })
      var _b2c_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2c_xml_field',
      })
      
      var _line_print_space = _currentRecord.getValue({
        fieldId: 'custpage_select_line_print_space',
      })

      var _genxml_toftp_result = 'Y'
      var _genxml_toftp_message = ''

      //20201110 walter modify access_model = [GATEWEB, NETSUITE]
      var _access_model = migxmlutility.getConfigureValue(
        'ACCESS_MODEL',
        'XML_MODEL'
      )
      console.log('access_model', _access_model)
      var _xmlObjectAry = migxmlutility.getVoucherToDoList(
        _access_model,
        voucher_type,
        voucher_list_id,
        _b2bs_xml,
        _b2be_xml,
        _b2c_xml,
        _genxml_toftp_result,
        _genxml_toftp_message,
        _select_error_item
      )

      var _xmlFileObjects = []
      var _doc_type = ''
      if (voucher_type == 'EGUI') {
        _doc_type = gwapiclient.DOCTYPE.INVOICE
      } else {
        _doc_type = gwapiclient.DOCTYPE.ALLOWANCE
      }

      if (_xmlObjectAry != null && _xmlObjectAry.length!=0) { 	
        for (var i = 0; i < _xmlObjectAry.length; i++) {
          var _obj = _xmlObjectAry[i]

          var _apply_id = _obj.apply_id
          var _xml = _obj.mig_xml
          var _file_name = _obj.file_name
          var _is_printed = _obj.is_printed //paper
          var _data_type = _obj.data_type //2:開立 , 3:作廢

          var _reprint = _obj.is_printed
          var _reprint_pdf = _obj.is_printed_pdf
          var _reprint_paper = _obj.is_printed_paper
          //var _extra_memo    = _obj.extra_memo;
          var _extra_memo = removeChangeLineChar(_obj.extra_memo) 
          //20210909 walter modify 取消 _extra_memo=''
          _extra_memo = ''
          //20201102 walter modify (NONE)
          var _need_upload_egui_mig = _obj.need_upload_egui_mig

          //documentStatus ==> 2: Issue[開立], 3: cancel[作廢], 4: void[註銷], 5: reject
          var _document_status = ''
          if (_data_type == '2') {
            _document_status = gwapiclient.DOCSTATUS.issue
            //_document_status=_data_type; //for test
          } else if (_data_type == '3') {
            _document_status = gwapiclient.DOCSTATUS.cancel
            //_document_status=_data_type; //for test
          }
          //alert('gwapiclient.DOCSTATUS.ISSUE='+gwapiclient.DOCSTATUS.issue+' ,gwapiclient.DOCSTATUS.CANCEL='+gwapiclient.DOCSTATUS.cancel);
          console.log('_doc_type', _doc_type)
          console.log('_document_status', _document_status)
          console.log('_file_name', _file_name)
          console.log('_xml', _xml)
          console.log('_reprint', _reprint)
          console.log('_extra_memo', _extra_memo)
          console.log('_need_upload_egui_mig', _need_upload_egui_mig)

          ///////////////////////////////////////////////////////////////////////////////////////
          var _need_upload_egui_status = true
          if (_need_upload_egui_mig == 'NONE') _need_upload_egui_status = false

          _xmlFileObjects.push({
            filename: _file_name + '.xml',
            xml: _xml,
            docType: _doc_type,
            docStatus: _document_status,
            extramemo: _extra_memo,
            uploadDocument: _need_upload_egui_status,
            reprint: _reprint,
            linePrintSpace: _line_print_space
          })
          ///////////////////////////////////////////////////////////////////////////////////////
          //Update MAIN print pdf flag is true _apply_id
          console.log('Pass xmlFileObjects=>' + JSON.stringify(_xmlFileObjects))
          //alert('_data_type='+_data_type+' ,document_status='+_document_status);
          try {
            var values = {}
            if (printType == 'PDF') {
              values['custrecord_gw_is_printed_pdf'] = true
              if (_reprint_pdf == false) {
                var _id = record.submitFields({
                  type: _voucher_main_record,
                  id: parseInt(_apply_id),
                  values: values,
                  options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                  },
                })
              }
            } else {
              values['custrecord_gw_is_printed_paper'] = true
              if (_reprint_paper == false) {
                var _id = record.submitFields({
                  type: _voucher_main_record,
                  id: parseInt(_apply_id),
                  values: values,
                  options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                  },
                })
              }
            }
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }

          ///////////////////////////////////////////////////////////////////////////////////////
        }
        try {
	        if (printType == 'PDF') {
	          gwapiclient.downloadPdfs(_xmlFileObjects)
	        } else {
	          gwapiclient.printToPrinter(_xmlFileObjects)
	        }
	    } catch (e) {
	       console.log('error', e)
	    } 
      } else { 
		var _title = '下載PDF管理'; 
		var _text = '電子發票'
		if (voucher_type != 'EGUI') {
			_text = '電子發票折讓單'
		} 
		var _message = '請勿選取開立錯誤或非'+_text+'憑證下載!'									
		gwmessage.showErrorMessage(_title, _message)
		return			
      } 
      
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    document.forms[0].submit()
  }

  function removeChangeLineChar(text) {
    console.log('removeChangeLineChar', text)
    if (text) {
      while (text.indexOf('\r') > -1) {
        text = text.replace('\r', '')
      }
      while (text.indexOf('\n') > -1) {
        text = text.replace('\n', '')
      }
    }
    return text
  }

  //Gen XML Function-End
  /////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////////////////////////////
  //作廢作業-START
  function submitCancelProcess(voucher_open_type) {
    console.log('submitCancelProcess start:' + voucher_open_type)
    try {
      //voucher_open_type =>SINGLE-EGUI-SCHEDULE, SINGLE-ALLOWANCE-SCHEDULE
      var _title = '憑證作廢管理'
      var _checkJsonObject = validateCancelTask(voucher_open_type)
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag) {
        var _cancel_reason = prompt('請輸入作廢原因[長度限制(20)個字]')
        if (typeof _cancel_reason === 'undefined' || _cancel_reason == null) {
          return
        } else if (_cancel_reason.length == 0 || _cancel_reason.length >= 20) {
          var _message = '作廢原因不可空白或過20個字!'
          gwmessage.showErrorMessage(_title, _message)

          return
        }

        var _selected_business_no = _currentRecord.getValue({
            fieldId: 'custpage_businessno',
          })
        var _voucher_hiddent_listid = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })

        startBatchProcess(
          voucher_open_type,
          _selected_business_no,
          _voucher_hiddent_listid,
          _cancel_reason
        )

        var _message = '批次作廢作業已進入排程!'
        gwmessage.showInformationMessage(_title, _message)

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function searchDocumentList(_invoice_hiddent_listid) {
    console.log('searchDocumentList start')
    var _documentNoAry = []
    try {
      var _idAry = _invoice_hiddent_listid.split(',')
      var _mySearch = search.create({
        type: _voucher_main_record,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_voucher_number',
            sort: search.Sort.ASC,
          }),
        ],
      })
      var _filterArray = []
      _filterArray.push(['internalId', search.Operator.ANYOF, _idAry])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        var internalid = result.id
        var _document_number = result.getValue({
          name: 'custrecord_gw_voucher_number',
        })
        _documentNoAry.push(_document_number)
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _documentNoAry
  }

  function startBatchProcess(
    voucher_open_type,
    business_no,
    voucher_hiddent_listid,
    cancel_reason
  ) {
    try {
      var _documentNoAry = searchDocumentList(voucher_hiddent_listid)

      var _closed_voucher = 'N'
      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //只要記錄選取得資料即可(畫面不顯示)=>在Schedule執行開立發票+折讓單的動作
      var _voucherApplyRecord = record.create({
        type: _voucher_apply_list_record,
        isDynamic: true,
      })

      _voucherApplyRecord.setValue({ fieldId: 'name', value: 'VoucherApply' })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_type',
        value: 'CANCEL',
      }) //APPLY (開立) / CANCEL (作廢)
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_open_type',
        value: voucher_open_type,
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_date',
        value: new Date(gwDateUtil.getNsCompatibleDate())
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_time',
        value: gwDateUtil.getCurrentDateTime().time
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_void_comment',
        value: cancel_reason,
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_seller',
        value: business_no,
      })
      
      
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_yearmonth',value:_year_month});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_seller',value:applyMainObj.company_ban});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_seller_name',value:applyMainObj.company_name});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_buyer',value:applyMainObj.buyer_identifier});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_buyer_name',value:applyMainObj.buyer_name});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_dept_code',value:applyMainObj.dept_code});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_dept_name',value:applyMainObj.dept_code});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_class',value:applyMainObj.classification});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_invoice_type',value:applyMainObj.invoice_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_mig_type',value:applyMainObj.mig_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_gui_yearmonth_type',value:applyMainObj.gui_yearmonth_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_status',value:_voucher_apply_atatus});
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_flow_status',
        value: 'CANCEL_ISSUE',
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_closed_voucher',
        value: _closed_voucher,
      })
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_discountamount',value:applyMainObj.discountamount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_sales_amount',value:applyMainObj.sales_amount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_amount',value:applyMainObj.tax_amount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_type',value:applyMainObj.tax_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_rate',value:applyMainObj.tax_rate});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_total_amount',value:applyMainObj.total_amount});
      //voucher_open_type =>SINGLE-EGUI-SCHEDULE, SINGLE-ALLOWANCE-SCHEDULE

      if (voucher_open_type.indexOf('EGUI') != -1) {
        //EGUI
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_invoice_apply_list',
          value: voucher_hiddent_listid,
        })
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_invoice_todo_list',
          value: voucher_hiddent_listid,
        })
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_invoice_document_no',
          value: _documentNoAry.toString(),
        })
      } else {
        //ALLOWANCE
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_creditmemo_apply_list',
          value: voucher_hiddent_listid,
        })
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_creditmemo_todo_list',
          value: voucher_hiddent_listid,
        })
        _voucherApplyRecord.setValue({
          fieldId: 'custrecord_gw_creditmemo_document_no',
          value: _documentNoAry.toString(),
        })
      }
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_mig',
        value: 'Y',
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_completed_schedule_task',
        value: 'N',
      })

      try {
        var _applyId = _voucherApplyRecord.save()
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }

      var _idAry = voucher_hiddent_listid.split(',')
      for (var i = 0; i < _idAry.length; i++) {
        var _internalId = _idAry[i]
        if (parseInt(_internalId) > 0) {
          var _record = record.load({
            type: _voucher_main_record,
            id: parseInt(_internalId),
            isDynamic: true,
          })

          _record.setValue({
            fieldId: 'custrecord_gw_voucher_upload_status',
            value: 'A',
          }) //新開立
          //1:開立申請(VOUCHER_ISSUE),2:開立成功(VOUCHER_SUCCESS),
          //6:作廢申請(CANCEL_ISSUE) 7:作廢退回(CANCEL_REJECT) 9:作廢成功(CANCEL_SUCCESS)
          _record.setValue({
            fieldId: 'custrecord_gw_voucher_status',
            value: 'CANCEL_ISSUE',
          })
          try {
            _record.save()
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }
        }
      }
      //將發票或折讓單狀態回寫回NS Document
      syncEguiUploadStatusToNSEvidenceStatus('CANCEL_ISSUE', 'A', 'ALL', '', _idAry)
      
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }
    
  //voucher_status = [VOUCHER_SUCCESS, CANCELL_APPROVE]
  function syncEguiUploadStatusToNSEvidenceStatus(voucher_status, voucher_upload_status, need_upload_egui_mig, gui_apply_period, voucher_main_internalid_ary) {  	
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
  		    	
  		      	 var _voucher_type         = _result.values.custrecord_gw_voucher_type //EGUI, ALLOWANCE
  		    	 var _ns_document_type     = _result.values['CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type'].toUpperCase()
  		    	 var _ns_document_apply_id_obj = _result.values['CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_apply_id']
  			   	 var _ns_document_apply_id = _ns_document_apply_id_obj[0].value
  		    	
  		    	 var _evidence_status_id = getGwEvidenceStatus(voucher_status, voucher_upload_status, need_upload_egui_mig)
  			
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
  		  	     if (gui_apply_period.length !=0) {
  		  	    	 values['custbody_gw_gui_apply_period'] = gui_apply_period
  		  	     }
  		  	     
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
    	console.log(e.name + ':' + e.message)
    } 
  }
   
  function getGwEvidenceStatus(gw_voucher_status, voucher_upload_status, need_upload_egui_mig) {   	
	var _gw_evidence_status_id = -1
    try {      	
    	 var _gw_evidence_status = ''
    	 if (gw_voucher_status.toUpperCase().indexOf('CANCEL') !=-1) {
    		 //CE	憑證作廢上傳已失敗
        	 //CC	憑證作廢上傳已成功
        	 //CP	憑證作廢已上傳
        	 //CI	憑證作廢待審核
        	 //CA	憑證已作廢
        	 //PC	憑證已作廢, 未進入關網系統
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status ='PC'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ISSUE') !=-1) {
    			 _gw_evidence_status ='CI'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_APPROVE') !=-1) {
    			 _gw_evidence_status ='CP'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_SUCCESS') !=-1) {
    			 _gw_evidence_status ='CC'
    		 } else if (gw_voucher_status.toUpperCase().indexOf('CANCEL_ERROR') !=-1 ||
    				    voucher_upload_status =='E') {
    			 _gw_evidence_status ='CE'
    		 }
    			 
    	 } else {
    		 //A	憑證已開立
        	 //PA	憑證已開立, 未進入關網系統
        	 //I	憑證未開立
        	 //IE	憑證開立上傳已失敗
        	 //IC	憑證開立上傳已成功
        	 //IP	憑證開立已上傳 
    		 if (need_upload_egui_mig == 'NONE') {
    			 _gw_evidence_status = 'PA'
    		 } else if (voucher_upload_status == 'A') {
    			 _gw_evidence_status = voucher_upload_status
    		 } else { 
    			 _gw_evidence_status = 'I'+voucher_upload_status
    		 }
    		 
    	 } 
    	 
    	 _gw_evidence_status_id = getByStatusCode(_gw_evidence_status) 
    	 
    } catch (e) {
    	console.log(e.name + ':' + e.message)
    } 
    
    return _gw_evidence_status_id
  }
  
  var _gw_evidence_status_ary = []
  function getByStatusCode(gw_evidence_status) {   	
	var _gw_evidence_status_id = -1
    try {      	    	
    	if (_gw_evidence_status_ary.length !=0) {
    		for (var i=0; i<_gw_evidence_status_ary.length; i++) {
    			 var _obj  = _gw_evidence_status_ary[i]
    			 if (_obj.status_value == gw_evidence_status) {
    				 _gw_evidence_status_id = _obj.internal_id
    				 break
    			 }
    		}
    	}
     	 
    	if (_gw_evidence_status_id == -1) {
	    	var _my_search = search.create({
	            type: 'customrecord_gw_evidence_status',
	            columns: [
	              search.createColumn({ name: 'custrecord_gw_evidence_status_value' }), //CE
	              search.createColumn({ name: 'custrecord_gw_evidence_status_text' }),  //憑證作廢上傳已失敗
	            ],
	        })
	        
	        var _filter_array = []
	    	_filter_array.push(['custrecord_gw_evidence_status_value', search.Operator.IS, gw_evidence_status])
		    _my_search.filterExpression = _filter_array 
		     
		    _my_search.run().each(function (result) {	
		    	var _result = JSON.parse(JSON.stringify(result)) 
		    			    	
	        	var _internalid = _result.id 	        	
	        	var _evidence_status_value = _result.values.custrecord_gw_evidence_status_value
	        	
	        	var _obj = {
	        		'internal_id': _internalid,
	        		'status_value': _evidence_status_value
	        	}		    	
	        	_gw_evidence_status_ary.push(_obj)	        
	        	_gw_evidence_status_id = _internalid
	        	
	        	return true
	        })
    	}
    } catch (e) {
    	console.log(e.name + ':' + e.message)
    } 
    
    return _gw_evidence_status_id
  }
    
  //作廢作業-END
  ////////////////////////////////////////////////////////////////////////////////////////
  function mark(
    flag,
    select_sublistId,
    select_field_id,
    select_checked_field_id
  ) {
    try {
      _voucherIdArray = [-1]
      var _num_lines = _currentRecord.getLineCount({
        sublistId: select_sublistId,
      })
      if (_num_lines > 0) {
        for (var i = 0; i < _num_lines; i++) {
          var _id = _currentRecord.getSublistValue({
            sublistId: select_sublistId,
            fieldId: select_field_id,
            line: i,
          })

          var _flag_value = 'F'
          if (flag == true) {
            _flag_value = 'T'
          }

          _currentRecord.selectLine({
            sublistId: select_sublistId,
            line: i,
          })

          _currentRecord.setCurrentSublistValue({
            sublistId: select_sublistId,
            fieldId: select_checked_field_id,
            value: flag,
            ignoreFieldChange: true,
          })

          if (flag == true) _voucherIdArray.push(_id)
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_voucher_hiddent_listid',
        value: _voucherIdArray.toString(),
        ignoreFieldChange: true,
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  //重傳作業-START
  function reSendToGWProcess(voucher_upload_type) {
    console.log('reSendToGWProcess start:' + voucher_upload_type)
    try {
      //voucher_upload_type =>EGUI, ALLOWANCE 
      var _title = '憑證重傳管理'
      var _checkJsonObject = validateReUploadTask(voucher_upload_type, true)
      
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag) {
        var _voucherSelectedIds = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })
        saveVoucherDateAndStatus(voucher_upload_type, _voucherSelectedIds)

        var _message = '重傳作業完成!'
        gwmessage.showInformationMessage(_title, _message)

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //不上傳申報(set voucher_status=C, year_month=10912
  function reportTxtNotUpload(voucher_upload_type, voucher_upload_status) {
    console.log(
      'reportTxtNotUpload start:' +
        voucher_upload_type +
        ' ,voucher_upload_status=' +
        voucher_upload_status
    )
    try {
      //voucher_upload_type =>EGUI, ALLOWANCE
      var _title = '憑證重傳管理'
      var _need_check = true
      //不申報不檢查
      if (voucher_upload_status=='A')_need_check = false
      
      var _checkJsonObject = validateReUploadTask(voucher_upload_type, _need_check)
      
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag) {
        var _voucherSelectedIds = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })
        saveVoucherYearMonthAndStatus(
          voucher_upload_type,
          voucher_upload_status,
          _voucherSelectedIds
        )

        var _message = '不上傳申報設定完成!'
        gwmessage.showInformationMessage(_title, _message)

        document.forms[0].submit()
      } else {
        gwmessage.showErrorMessage(_title, _message)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function validateReUploadTask(voucher_upload_type, need_check) {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      var _voucherSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })

      var _voucherIdAry = _voucherSelectedIds.split(',')
      if (_voucherIdAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取重傳憑證資料!'
      } else {
        for (var i = 0; i < _voucherIdAry.length; i++) {
          var _internalId = _voucherIdAry[i]

          if (parseInt(_internalId) > 0) {
            //取得 sublist 的 entityid(客戶代碼)
            var _voucher_number = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_number',
              _internalId
            )
            var _voucher_date = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_reupload_date',
              _internalId
            )       
             
            _voucher_date = dateutility.getConvertVoucherDateByDate(_voucher_date)
        
            var _year_month = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'customer_voucher_year_month',
              _internalId
            ) 
            
            if (need_check==true) {
	            if (!validateTraditionYearMonth(_year_month) || 
	            	(stringutility.convertToFloat(_year_month.substring(3,5)) >12 && stringutility.convertToFloat(_year_month.substring(3,5)) <=0) ||
	            	stringutility.convertToFloat(_year_month) % 2 !=0) {
	              _checkFlag = false
	              _error_message += _voucher_number + '-申報年月格式錯誤[需為民國年雙月共5碼],'
	            }
	            if (_voucher_date.length == 0) {
	              _checkFlag = false
	              _error_message += _voucher_number + '-上傳日期不可空白,'
	            }
	            //折讓單回收作業-檢查填入日期須大於等於原開立日期, 期數檢查=原期或次期.
	            var _original_voucher_date = getSublistColumnValue(
                    'vouchersublistid',
                    'customer_search_voucher_id',
                    'customer_voucher_date',
                    _internalId
                )
                //填入日期須大於等於原開立日期
                /////////////////////////////////////////////////////////////////////////////////////////
                //日期:區間檢查
                //1.新上傳日期>=原憑證開立日期     
                if (_voucher_date.length !=0){
	                if (_checkFlag==true && stringutility.convertToFloat(_voucher_date) < stringutility.convertToFloat(_original_voucher_date)){
	                	_checkFlag = false
	  	                _error_message += _voucher_number + '上傳日期('+_voucher_date+')不可小於原憑證開立日期('+_original_voucher_date+'),'
	                }
		            //2.新上傳日期<=今日
		            if (_checkFlag==true && stringutility.convertToFloat(_voucher_date) > stringutility.convertToFloat(dateutility.getConvertVoucherDateByDate(dateutility.getNetSuiteLocalDate()))){
	                	_checkFlag = false
	  	                _error_message += _voucher_number + '上傳日期('+_voucher_date+')不可大於今天,'
	                }
                }
                /////////////////////////////////////////////////////////////////////////////////////////
                /////////////////////////////////////////////////////////////////////////////////////////
	            //期別:區間檢查  	    
	            var _original_voucher_yearmonth= dateutility.getTaxYearMonthByYYYYMMDD(_original_voucher_date)	       

                //1.新申報期別>=原始憑證開立期別                
                if (_voucher_date.length !=0 && _year_month.length !=0){                	
                	var _apply_date_year_month=dateutility.getTaxYearMonthByYYYYMMDD(_voucher_date) //新申報日期期別
                
	                if (_checkFlag==true && stringutility.convertToFloat(_year_month)<stringutility.convertToFloat(_original_voucher_yearmonth) ){
	                	_checkFlag = false
	                	_error_message += _voucher_number + '上傳期別('+_year_month+')不可小於原憑證開立期別('+_original_voucher_yearmonth+'),'
	                }
		            //2.新申報日期所屬期別<=新申報期別  
		            if (_checkFlag==true && stringutility.convertToFloat(_apply_date_year_month)>stringutility.convertToFloat(_year_month) ){
	                	_checkFlag = false
	                	_error_message += _voucher_number + '上傳期別('+_year_month+')不可小於申報日期所屬期別('+_apply_date_year_month+'),'
	                }	            
		            //3.新申報期別 =新申報日期所屬(期別或次期) period_month=2:1期 , period_month=4:2期...以此類推
		            var _period_month=1
		            var _year_month_date = (191100+parseInt(_year_month))+'01'
		              
		            if (_checkFlag==true && dateutility.getMonthPeriodDiff(_voucher_date, _year_month_date, _period_month) != true){
		            	_checkFlag = false
	                	_error_message += _voucher_number + '上傳期別('+_year_month+')不可大於下下期,'
		            }
		            /**
		            if (_checkFlag==true){
			            if ( ( (stringutility.convertToFloat(_year_month)-stringutility.convertToFloat(_apply_date_year_month)) > _period_month && (stringutility.convertToFloat(_year_month)-stringutility.convertToFloat(_apply_date_year_month)) <= 10 ) ||
			            	 (stringutility.convertToFloat(_year_month)-stringutility.convertToFloat(_apply_date_year_month)) > (90+_period_month) ){
		                	_checkFlag = false
		                	_error_message += _voucher_number + '上傳期別('+_year_month+')不可大於下期,'
		                }
		            }
		            */
                }
                /////////////////////////////////////////////////////////////////////////////////////////
            }             
            
          }
        }
      }
      _jsonResult = {
        checkflag: _checkFlag,
        message: _error_message,
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _jsonResult
  }

  function validateTraditionYearMonth(value) {
    var _regxp = /^[0-9]{3}[0-9]{2}$/
    if (_regxp.test(value)) {
      return true
    } else {
      return false
    }
    return false
  }

  function saveVoucherDateAndStatus(voucher_upload_type, _voucherSelectedIds) {
    try {
      var _voucherIdAry = _voucherSelectedIds.split(',')
      for (var i = 0; i < _voucherIdAry.length; i++) {
        var _internalId = _voucherIdAry[i]

        if (parseInt(_internalId) > 0) {
          //取得 sublist 的 entityid(客戶代碼)
          var _voucher_date = getSublistColumnValue(
            'vouchersublistid',
            'customer_search_voucher_id',
            'customer_voucher_reupload_date',
            _internalId
          )
          //var _voucher_date = getSublistColumnValue('vouchersublistid', 'customer_search_voucher_id', 'customer_voucher_reupload_date', _internalId);
          var _year_month = getSublistColumnValue(
            'vouchersublistid',
            'customer_search_voucher_id',
            'customer_voucher_year_month',
            _internalId
          )

          //1.load main
          //2. update date and upload status
          var values = {}
          values['custrecord_gw_need_upload_egui_mig'] = voucher_upload_type
          var _date = ''
          if (_voucher_date != '') {
            _date = dateutility.getConvertDateByDate(_voucher_date.toString())
            values['custrecord_gw_voucher_date'] = _date
          }

          var _apply_period = ''
          if (_year_month != '') {
            values['custrecord_gw_voucher_yearmonth'] = _year_month
            _apply_period = invoiceutility.getApplyPeriodOptionId(_year_month)
            values['custrecord_voucher_sale_tax_apply_period'] = _apply_period
          }
          //處理Detail Item
          var _is_35_format_code = updateVoucherDetailInfomation(
            _internalId,
            _date,
            _year_month,
            _apply_period
          )
          //alert('_is_35_format_code='+_is_35_format_code)
          //NE-326 非35格式不上傳
          if (_is_35_format_code==false){
        	  values['custrecord_gw_voucher_status'] = 'VOUCHER_SUCCESS'
       		  values['custrecord_gw_voucher_upload_status'] = 'C' 
       		  values['custrecord_gw_need_upload_egui_mig'] = 'NONE'
          }


          var _id = record.submitFields({
            type: _voucher_main_record,
            id: parseInt(_internalId),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
          
          //將發票或折讓單狀態回寫回NS Document
          var _id_ary = [_internalId] 
          syncEguiUploadStatusToNSEvidenceStatus('VOUCHER_SUCCESS', 'A', voucher_upload_type, _year_month, _id_ary)
          
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function updateVoucherDetailInfomation(
    _internalId,
    _date,
    _voucher_yearmonth,
    _apply_period
  ) {
	var _is_35_format = false
	
    try { 
     	
      var _mySearch = search.create({
        type: 'customrecord_gw_voucher_details',
        columns: [
          search.createColumn({ name: 'custrecord_gw_ns_document_item_id' }),
          search.createColumn({ name: 'custrecord_gw_original_gui_yearmonth' }),
          search.createColumn({ name: 'custrecord_gw_original_gui_number' }),
          search.createColumn({ name: 'custrecord_gw_original_gui_date' })
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_voucher_main_internal_id',
        search.Operator.IS,
        parseInt(_internalId),
      ])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        var internalid = result.id
        //NE-326 非35格式不上傳
        var _gw_original_gui_number = result.getValue({name: 'custrecord_gw_original_gui_number'}) 
        var _gw_original_gui_date = result.getValue({name: 'custrecord_gw_original_gui_date'}) 
        
        if (_gw_original_gui_number !=''){
        	_is_35_format = searchEGUI(_gw_original_gui_number, _gw_original_gui_date , '35') 
        }
     

        var values = {}
        if (_date != '') {
          values['custrecord_gw_dtl_voucher_date'] = _date
        }
        if (_voucher_yearmonth != '') {
          values['custrecord_gw_dtl_voucher_yearmonth'] = _voucher_yearmonth
          values['custrecord_gw_dtl_voucher_apply_period'] = _apply_period
        }
        var _id = record.submitFields({
          type: 'customrecord_gw_voucher_details',
          id: parseInt(internalid),
          values: values,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        })

        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    
    return _is_35_format
  }
   
  //NE-326 非35格式不上傳
  function searchEGUI(original_gui_number, original_gui_date , format_code) {
	    var _has = false
	    try {
	      var _mySearch = search.create({
	        type: 'customrecord_gw_voucher_main',
	        columns: [ 
	          search.createColumn({ name: 'custrecord_gw_voucher_number' }),
	          search.createColumn({ name: 'custrecord_gw_voucher_date' }),
	          search.createColumn({ name: 'custrecord_gw_voucher_format_code' })
	        ],
	      })

	      var _filterArray = []
	      _filterArray.push(['custrecord_gw_voucher_number', search.Operator.IS, original_gui_number])
	      _filterArray.push('and')
	      _filterArray.push(['custrecord_gw_voucher_date', search.Operator.IS, original_gui_date])
	      _filterArray.push('and')
	      _filterArray.push(['custrecord_gw_voucher_format_code', search.Operator.IS, format_code])
	      //alert('filterArray==>'+JSON.stringify(_filterArray))
	      _mySearch.filterExpression = _filterArray

	      _mySearch.run().each(function (result) {
	        var internalid = result.id
	        _has = true

	        return true
	      })
	    } catch (e) {
	      console.log(e.name + ':' + e.message)
	    }
	    return _has
  }

  function saveVoucherYearMonthAndStatus(
    voucher_upload_type,
    voucher_upload_status,
    voucherSelectedIds
  ) {
    try {
      var _voucherIdAry = voucherSelectedIds.split(',')
      for (var i = 0; i < _voucherIdAry.length; i++) {
        var _internalId = _voucherIdAry[i]

        if (parseInt(_internalId) > 0) {
          //取得 sublist 的 entityid(客戶代碼)
          var _voucher_date = getSublistColumnValue(
            'vouchersublistid',
            'customer_search_voucher_id',
            'customer_voucher_reupload_date',
            _internalId
          )
          var _year_month = getSublistColumnValue(
            'vouchersublistid',
            'customer_search_voucher_id',
            'customer_voucher_year_month',
            _internalId
          )
          //TODO
          //1.load main
          //2. update date and upload status
          var values = {}
          values['custrecord_gw_voucher_upload_status'] = voucher_upload_status

          if (_year_month != '') {
            values['custrecord_gw_voucher_yearmonth'] = _year_month
            var _apply_period = invoiceutility.getApplyPeriodOptionId(
              _year_month
            )
            values['custrecord_voucher_sale_tax_apply_period'] = _apply_period
            //處理Detail Item
            var _date = ''
            if (_voucher_date.toString() != '') {
              _date = dateutility.getConvertDateByDate(_voucher_date.toString())
              values['custrecord_gw_voucher_date'] = _date
            }
            var _is_35_format_code = updateVoucherDetailInfomation(
              _internalId,
              _date,
              _year_month,
              _apply_period
            )
          }
          var _id = record.submitFields({
            type: _voucher_main_record,
            id: parseInt(_internalId),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //重傳作業-END
  ////////////////////////////////////////////////////////////////////////////////////////
  

  ////////////////////////////////////////////////////////////////////////////////////////
  //重傳作業-START
  function submitEmailProcess(selected_task) {
      console.log('submitEmailProcess selected_task:' + selected_task)
      try {     
	      var _title = '憑證重傳Mail管理'
	    	  
	      var _check_result  = validateSendEmailTask()
	      var _check_flag    = _check_result.checkflag
	      var _error_message = _check_result.message
	        
    	  var _voucher_selected_ids = _currentRecord.getValue({fieldId: 'custpage_voucher_hiddent_listid'})
         
	      if (_check_flag) { 
	    	  var _params = {
	    		  'selected_task': selected_task,
    	          'selected_hiddent_listid': _voucher_selected_ids
    	      }
	    	  
    	      window.location = url.resolveScript({
    	          scriptId: 'customscript_gw_send_email_action',
    	          deploymentId: 'customdeploy_gw_send_email_action',
    	          params: _params,
    	          returnExternalUrl: false,
    	      })	     
	      } else {
	          gwmessage.showErrorMessage(_title, _error_message)
	      }
      } catch (e) {
          console.log(e.name + ':' + e.message)
      }
  }
  
  function validateSendEmailTask() {
    var _json_result
    try {
         var _check_flag = true
         var _error_message = ''
	     var _voucher_selected_ids = _currentRecord.getValue({fieldId: 'custpage_voucher_hiddent_listid'})
	
	     var _voucher_id_ary = _voucher_selected_ids.split(',')
	     if (_voucher_id_ary.length == 1) {
	         //沒選取
	    	 _check_flag = false
	         _error_message = '請選取重傳Mail憑證資料!'
	     } else {
	        for (var i = 0; i < _voucher_id_ary.length; i++) {
	          var _internal_id = _voucher_id_ary[i]
	
	          if (parseInt(_internal_id) > 0) {
	            //取得 sublist 的 entityid(客戶代碼)
	            var _voucher_upload_status = getSublistColumnValue(
		              'vouchersublistid',
		              'customer_search_voucher_id',
		              'customer_voucher_upload_status',
		              _internal_id
	            )	   
	            var _voucher_number = getSublistColumnValue(
		              'vouchersublistid',
		              'customer_search_voucher_id',
		              'customer_voucher_number',
		              _internal_id
	            ) 
	             
	            if (_voucher_upload_status == 'E') {
	            	_check_flag = false
	                _error_message += _voucher_number + '-請勿寄送開立錯誤的憑證,'
	            }
	          }
	        }
	     }
	     
         _json_result = {
	        'checkflag': _check_flag,
	        'message': _error_message
	     }
    } catch (e) {
       console.log(e.name + ':' + e.message)
    }
    return _json_result
  }
  //重傳作業-END
  ////////////////////////////////////////////////////////////////////////////////////////////
  function pageInit() {
    try {    	
    	var _email_task_title   = _currentRecord.getValue({fieldId: 'hidden_email_task_title'})
    	var _email_task_message = _currentRecord.getValue({fieldId: 'hidden_email_task_message'})
    	
    	if (_email_task_title.length !=0) {
    		gwmessage.showInformationMessage(_email_task_title, _email_task_message)
    	}     	
    } catch (e) {
        console.log(e.name + ':' + e.message)
    }
  }

  return {
    pageInit: pageInit,
    mark: mark,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged,
    resetSelected: resetSelected,
    unLockSelected: unLockSelected,
    submitEmailProcess: submitEmailProcess,
    submitCancelProcess: submitCancelProcess,
    reSendToGWProcess: reSendToGWProcess,
    reportTxtNotUpload: reportTxtNotUpload,
    printPDFSelected: printPDFSelected,
    printPaperSelected: printPaperSelected,
    searchResults: searchResults,
  }
})
