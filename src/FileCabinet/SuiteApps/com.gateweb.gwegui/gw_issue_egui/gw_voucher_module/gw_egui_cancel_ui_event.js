/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/search',
  'N/currentRecord',
  'N/record',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_gwmessage_utility',
], function (
  search,
  currentRecord,
  record,
  gwconfigure,
  dateutility,
  stringutility,
  gwmessage
) {
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()

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

    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)
    if (_changeFieldId == 'custpage_status') {
    }
  }

  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
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
        _voucherIdArray.push(_selectCheckId)
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
  function validate(voucher_open_type) {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      var _voucherSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      alert('_voucherSelectedIds=' + _voucherSelectedIds)
      var _voucherIdAry = _voucherSelectedIds.split(',')

      if (_voucherIdAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取作廢憑證資料!'
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
            var _voucher_date = getSublistColumnValue(
              'vouchersublistid',
              'customer_search_voucher_id',
              'custrecord_gw_voucher_date',
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
            console.log(
              'voucher_number=' +
                _voucher_number +
                ', discounted = ' +
                _discounted +
                ' ,upload_status=' +
                _upload_status
            )

            if (voucher_open_type.indexOf('ALLOWANCE') != -1) {
              _error_message = ']:折讓單尚未處理成功不可作廢!'
            } else if (voucher_open_type.indexOf('EGUI') != -1) {
              _error_message = ']:發票尚未處理成功不可作廢!'
            }
            if (stringutility.trim(_upload_status) != 'C') {
              _error_message = '[' + _voucher_number + _error_message
              _checkFlag = false
              break
            }

            if (
              voucher_open_type.indexOf('EGUI') != -1 &&
              stringutility.trim(_discounted) !== ''
            ) {
              _error_message = '[' + _voucher_number + ']:有折讓單不可作廢!'
              _checkFlag = false
              break
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

  ////////////////////////////////////////////////////////////////////////////////////////
  //作廢作業-START
  function submitCancelProcess(voucher_open_type) {
    console.log('submitCancelProcess start:' + voucher_open_type)
    try {
      //voucher_open_type =>SINGLE-EGUI-SCHEDULE, SINGLE-ALLOWANCE-SCHEDULE
      var _title = '憑證作廢管理'
      var _checkJsonObject = validate(voucher_open_type)
      var _checkFlag = _checkJsonObject.checkflag
      var _message = _checkJsonObject.message

      if (_checkFlag) {
        var _cancel_reason = prompt('請輸入作廢原因[長度限制(20)個字]')
        if (typeof _cancel_reason === 'undefined' || _cancel_reason == null) {
          return
        } else if (_cancel_reason.length == 0 || _cancel_reason.length >= 20) {
          var _message = '作廢原因不可空白或過20個字!'
          gwmessage.showInformationMessage(_title, _message)

          return
        }

        var _voucher_hiddent_listid = _currentRecord.getValue({
          fieldId: 'custpage_voucher_hiddent_listid',
        })

        startBatchProcess(
          voucher_open_type,
          _voucher_hiddent_listid,
          _cancel_reason
        )

        var _message = '批次作廢作業已進入排程!'
        gwmessage.showInformationMessage(_title, _message)
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
        value: dateutility.getNetSuiteLocalDate(),
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_time',
        value: dateutility.getCompanyLocatTime(),
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_void_comment',
        value: cancel_reason,
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
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //作廢作業-END
  ////////////////////////////////////////////////////////////////////////////////////////

  function pageInit() {
    try {
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged,
    submitCancelProcess: submitCancelProcess,
    searchResults: searchResults,
  }
})
