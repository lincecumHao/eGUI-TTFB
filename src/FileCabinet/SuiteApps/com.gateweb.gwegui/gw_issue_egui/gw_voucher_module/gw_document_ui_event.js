/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/runtime',
  'N/ui/dialog',
  'N/search',
  'N/currentRecord',
  'N/record',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_validate_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_gwmessage_utility',
], function (
  runtime,
  dialog,
  search,
  currentRecord,
  record,
  gwconfigure,
  validater,
  dateutility,
  invoiceutility,
  gwmessage
) {
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
  var _invoce_control_field_value = gwconfigure.lockInvoceControlFieldId()
  var _creditmemo_control_field_id = gwconfigure.getCredMemoControlFieldId()
  var _creditmemo_control_lock_field_value = gwconfigure.lockCredMemoControlFieldId()
  var _creditmemo_control_unlock_field_value = gwconfigure.unLockCredMemoControlFieldId()

  var _gw_creditmemo_detail_search_id = gwconfigure.getGwCreditmemoDetailSearchId()

  var _defaultARAccount = gwconfigure.getGwInvoiceEditDefaultAccount()
  var _defaultAPAccount = gwconfigure.getGwCreditMemoEditDefaultAccount()
  var _currentRecord = currentRecord.get()
  var invoiceIdArray = [-1]
  var creditMemoIdArray = [-1]

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
    //invoicesublistid creditmemosublistid
    //處理 Invoice
    if (changedSubListId == 'invoicesublistid') {
      var _checkedResult = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_invoice_check_id',
      })
      var _selectCheckId = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_invoice_id',
      })
      console.log(
        'checkedResult=' + _checkedResult + ', selectCheckId=' + _selectCheckId
      )
      if (_checkedResult) {
        //add to array
        invoiceIdArray.push(_selectCheckId)
      } else {
        //remove from array
        for (var i = 0; i <= invoiceIdArray.length; i++) {
          if (invoiceIdArray[i] === _selectCheckId) {
            invoiceIdArray.splice(i, 1)
          }
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_invoice_hiddent_listid',
        value: invoiceIdArray.toString(),
        ignoreFieldChange: true,
      })
    }
    //處理Credit Memo
    if (changedSubListId == 'creditmemosublistid') {
      var _checkedResult = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_creditmemo_check_id',
      })
      var _selectCheckId = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_creditmemo_id',
      })
      console.log(
        'checkedResult=' + _checkedResult + ', selectCheckId=' + _selectCheckId
      )
      if (_checkedResult) {
        //add to array
        creditMemoIdArray.push(_selectCheckId)
      } else {
        //remove from array
        for (var i = 0; i <= creditMemoIdArray.length; i++) {
          if (creditMemoIdArray[i] === _selectCheckId) {
            creditMemoIdArray.splice(i, 1)
          }
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_creditmemo_hiddent_listid',
        value: creditMemoIdArray.toString(),
        ignoreFieldChange: true,
      })
    }

    console.log(
      'invoiceIdArray=' +
        invoiceIdArray +
        ' , creditMemoIdArray=' +
        creditMemoIdArray
    )
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

      //customer_search_invoice_id
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

  //檢查客戶代碼不可重複 MANUAL_TASK or BATCH_TASK
  function validate(task) {
    var _jsonResult
    try {
      var _checkFlag = true
      var _error_message = ''
      //open type = 1 只有Invoice
      //open type = 3 只有Allowance
      //open type = 5 Invoice+Allowance

      var _checkOpenType = '0'
      var _checkToatlAmount = 0
      //檢查 Invoice 的客戶代碼
      var _invoiceSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_invoice_hiddent_listid',
      })
      var _invoiceIdAry = _invoiceSelectedIds.split(',')

      var _creditMemoSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_creditmemo_hiddent_listid',
      })
      var _creditMemoAry = _creditMemoSelectedIds.split(',')

      if (_invoiceIdAry.length == 1 && _creditMemoAry.length == 1) {
        //沒選取
        _checkFlag = false
        _error_message = '請選取憑證資料!'
      } else {
        //check selected items
        var _checkDocumentIndexId = ''
        for (var i = 0; i < _invoiceIdAry.length; i++) {
          var _internalId = _invoiceIdAry[i]

          if (parseInt(_internalId) > 0) {
            //取得 sublist 的 entityid(客戶代碼)
            var _entityName = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_entity',
              _internalId
            )
            var _department = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_department',
              _internalId
            )
            var _class = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_class',
              _internalId
            )
            //開立統編
            var _entity_id = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_entity_id',
              _internalId
            )
            var _tax_id_number = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_used_businessno',
              _internalId
            )

            //var _checkIdText = _entityId+_department+_class+'';
            var _checkIdText = _entity_id + '' + _tax_id_number + ''

            var _total = getSublistColumnValue(
              'invoicesublistid',
              'customer_search_invoice_id',
              'customer_invoice_total',
              _internalId
            )
            console.log('invoice _total = ' + _total)
            _checkToatlAmount += parseFloat(_total)

            if (_checkDocumentIndexId === '') {
              //第 1 筆不檢查
              _checkDocumentIndexId = _checkIdText
            } 
            if (!validater.isValidGUI(_tax_id_number) && _tax_id_number !='0000000000') {
                _checkFlag = false
                _error_message = '開立統編錯誤或空白!'
                break
            } else {
              if (
                _checkDocumentIndexId != _checkIdText &&
                task == 'MANUAL_TASK'
              ) {
                _checkFlag = false
                //_error_message='不可混開不同的[統編+部門+類別]憑證資料!';
                //20201029 walter modify
                _error_message = '不可混開不同的[買方公司+開立統編]憑證資料!'
                break
              }
            }
            //open type = 1 只有Invoice
            _checkOpenType = '1'
          }
        }
        //檢查 CreditMemo 的客戶代碼
        if (_checkFlag == true) {
          for (var i = 0; i < _creditMemoAry.length; i++) {
            var _internalId = _creditMemoAry[i]

            if (parseInt(_internalId) > 0) {
              //取得sublist的entityid
              var _entityName = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_entity',
                _internalId
              )
              var _department = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_department',
                _internalId
              )
              var _class = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_class',
                _internalId
              )
              //開立統編
              var _tax_id_number = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_used_businessno',
                _internalId
              )

              var _entity_id = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_entity_id',
                _internalId
              )
              //var _checkIdText = _entityId+_department+_class+'';
              var _checkIdText = _entity_id + '' + _tax_id_number

              var _total = getSublistColumnValue(
                'creditmemosublistid',
                'customer_search_creditmemo_id',
                'customer_creditmemo_total',
                _internalId
              )
              console.log('creditmemo _total = ' + _total)
              _checkToatlAmount += parseFloat(_total)

              if (_checkDocumentIndexId === '') {
                //第 1 次不檢查
                _checkDocumentIndexId = _checkIdText
              }
              if (
                _tax_id_number.length != 8 &&
                _tax_id_number != '0000000000'
              ) {
                _checkFlag = false
                _error_message = '開立統編不可空白!'
                break
              } else {
                if (
                  _checkDocumentIndexId != _checkIdText &&
                  task == 'MANUAL_TASK'
                ) {
                  _checkFlag = false
                  //_error_message='不可混開不同的[統編+部門+類別]憑證資料!';
                  _error_message = '不可混開不同的[買方公司+開立統編]憑證資料!'
                  break
                }
              }

              if (_checkOpenType === '0') {
                //open type = 3 只有Allowance
                _checkOpenType = '3'
              } else {
                //open type = 5 Invoice+Allowance
                _checkOpenType = '5'
              }
            }
          }
        }

        //開立方式
        var _openDocumentType = ''
        if (_checkOpenType === '1') {
          //open type = 1 只開 GUI
          _openDocumentType = 'GUIDOCUMENT'
        } else if (_checkOpenType === '3') {
          //open type = 3 只開 Allowance
          _openDocumentType = 'ALLOWANCE'
        } else if (_checkOpenType === '5') {
          //需再判斷金額若>0 開發票, <0開折讓單
          if (_checkToatlAmount > 0) {
            //金額若>0 開發票
            _openDocumentType = 'GUIDOCUMENT'
          } else if (_checkToatlAmount < 0) {
            //金額若<0開折讓單
            _openDocumentType = 'ALLOWANCE'
          } else {
            //金額=0 不開發票
            _openDocumentType = 'NONE'
            _checkFlag = false
            _error_message = '金額為0不需開立!'
          }
        }
      }
      console.log(
        '_checkFlag = ' + _checkFlag + ' ,_error_message=' + _error_message
      )
      _jsonResult = {
        checkFlag: _checkFlag,
        message: _error_message,
        openDocumentType: _openDocumentType,
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _jsonResult
  }

  function submitSelected() {
    var _checkJsonObject = validate('MANUAL_TASK')

    var _checkFlag = _checkJsonObject.checkFlag
    var _openDocumentType = _checkJsonObject.openDocumentType
    var _message = _checkJsonObject.message

    if (_checkFlag) {
      _currentRecord.setValue({
        fieldId: 'custpage_hiddent_buttontype',
        value: _openDocumentType,
        ignoreFieldChange: true,
      })

      document.forms[0].submit()
    } else {
      var _title = '憑證管理'
      gwmessage.showErrorMessage(_title, _message)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  //批次作業-START
  function submitBatchProcess() {
    try {
      var _title = '憑證管理'
      var _checkJsonObject = validate('BATCH_TASK')
      /////////////////////////////////////////////////////////////////////////
      var _checkFlag = _checkJsonObject.checkFlag
      var _openDocumentType = _checkJsonObject.openDocumentType
      var _message = _checkJsonObject.message
      if (_checkFlag == false) {
        gwmessage.showErrorMessage(_title, _message)
        return
      }
      /////////////////////////////////////////////////////////////////////////
      var _invoiceSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_invoice_hiddent_listid',
      })
      var _invoiceIdAry = _invoiceSelectedIds.split(',')

      var _creditMemoSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_creditmemo_hiddent_listid',
      })
      var _invoicetype = _currentRecord.getValue({
        fieldId: 'custpage_select_invoicetype',
      })
      var _migtype = _currentRecord.getValue({
        fieldId: 'custpage_select_migtype',
      })

      var _voucher_open_type = _currentRecord.getValue({
        fieldId: 'custpage_select_voucher_open_type',
      })

      var _voucher_open_type_desc = ''
      if (_voucher_open_type == 'SINGLE-EGUIANDALLOWANCE-SCHEDULE') {
        _voucher_open_type_desc = '現開現折'
      } else if (_voucher_open_type == 'SINGLE-EGUI-SCHEDULE') {
        _voucher_open_type_desc = '開立發票'
      }

      var _creditMemoAry = _creditMemoSelectedIds.split(',')
      if (_invoiceIdAry.length > 1 && _creditMemoAry.length <= 1) {
        var _invoice_type_desc = invoiceutility.getInvoiceTypeDesc(_invoicetype)
        var _mig_type_desc = invoiceutility.getMigTypeDesc(_migtype)

        var options = {
          title: '憑證管理',
          message:
            '開立方式: ' +
            _invoice_type_desc +
            '-' +
            _mig_type_desc +
            '-' +
            _voucher_open_type_desc,
        }

        dialog.confirm(options).then(success).catch(failure)
      } else if (_creditMemoAry.length > 1) {
        var _message = '批次開立(現開現折)發票勿選Credit_Memo!'
        gwmessage.showErrorMessage(_title, _message)
      } else if (_invoiceIdAry.length == 1 && _creditMemoAry.length == 1) {
        var _message = '批次開立(現開現折)發票請選取Invoice!'
        gwmessage.showErrorMessage(_title, _message)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function failure(reason) {
    console.log('cancel this task=>' + reason)
  }

  function success(reason) {
    console.log('submitBatchProcess start reason ' + reason)
    try {
      if (reason == false) return

      var _userObj = runtime.getCurrentUser()
      var _user_id = _userObj.id

      var _title = '憑證管理'
    	  
      //20210513 walter modify	   
	  var _selected_businessno = _currentRecord.getValue({
        fieldId: 'custpage_businessno',
      })
      var _invoiceSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_invoice_hiddent_listid',
      })
      var _invoiceIdAry = _invoiceSelectedIds.split(',')

      var _creditMemoSelectedIds = _currentRecord.getValue({
        fieldId: 'custpage_creditmemo_hiddent_listid',
      })
      var _invoicetype = _currentRecord.getValue({
        fieldId: 'custpage_select_invoicetype',
      })
      var _migtype = _currentRecord.getValue({
        fieldId: 'custpage_select_migtype',
      })
      var _voucher_open_type = _currentRecord.getValue({
        fieldId: 'custpage_select_voucher_open_type',
      })
      //批次開立字軌分配部門+類別
      var _voucher_dept_code = _currentRecord.getValue({
        fieldId: 'custpage_dept_code',
      })
      var _voucher_class_code = _currentRecord.getValue({
        fieldId: 'custpage_classification',
      })
      //是否上傳折讓單
      var _voucher_upload_type = _currentRecord.getValue({
        fieldId: 'custpage_voucher_upload_type',
      })

      var _creditMemoAry = _creditMemoSelectedIds.split(',')

      if (_invoiceIdAry.length > 1 && _creditMemoAry.length <= 1) {
        //批次作業
        startBatchProcess(
          _selected_businessno,
          _voucher_open_type,
          _invoicetype,
          _migtype,
          _invoiceSelectedIds,
          _voucher_dept_code,
          _voucher_class_code,
          _voucher_upload_type,
          _user_id
        )

        var _message = '批次開立(現開現折)已進入排程作業!'
        gwmessage.showInformationMessage(_title, _message)

        searchResults()
      } else if (_creditMemoAry.length > 1) {
        var _message = '批次開立(現開現折)發票勿選CreditMemo!'
        gwmessage.showErrorMessage(_title, _message)
      } else if (_invoiceIdAry.length == 1 && _creditMemoAry.length == 1) {
        var _message = '批次開立(現開現折)發票請選取Invoice!'
        gwmessage.showErrorMessage(_title, _message)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function startBatchProcess(
	selected_business_no,
    voucher_open_type,
    invoicetype,
    migtype,
    invoice_hiddent_listid,
    voucher_dept_code,
    voucher_class_code,
    voucher_upload_type,
    user_id
  ) {
    try {
      //var _year_month            = dateutility.getTaxYearMonth();
      var _voucher_apply_atatus = 'P'
      var _closed_voucher = 'N'

      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //只要記錄選取得資料即可(畫面不顯示)=>在Schedule執行開立發票+折讓單的動作
      var _voucherApplyRecord = record.create({
        type: _voucher_apply_list_record,
        isDynamic: true,
      })

      _voucherApplyRecord.setValue({ fieldId: 'name', value: 'VoucherApply' })
      //20210513 walter modify
      //business_no=7-24549210[subsidiary_business_no]
      var _business_no_ary = selected_business_no.split('-');
      var _business_no = _business_no_ary[1];
      _voucherApplyRecord.setValue({ fieldId: 'custrecord_gw_voucher_apply_seller', value: _business_no })
      
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_type',
        value: 'APPLY',
      }) //APPLY (開立) / VOID (作廢)
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_open_type',
        value: voucher_open_type,
      }) //排程開
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_completed_schedule_task',
        value: 'N',
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_date',
        value: new Date(),
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_time',
        value: dateutility.getCompanyLocatTimeForClient(),
      })
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_yearmonth',value:_year_month});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_seller',value:applyMainObj.company_ban});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_seller_name',value:applyMainObj.company_name});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_buyer',value:applyMainObj.buyer_identifier});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_buyer_name',value:applyMainObj.buyer_name});

      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_invoice_type',
        value: invoicetype,
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_mig_type',
        value: migtype,
      })
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_gui_yearmonth_type',value:applyMainObj.gui_yearmonth_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_status',value:_voucher_apply_atatus});

      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_closed_voucher',
        value: _closed_voucher,
      }) //查詢畫面不顯示
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_discountamount',value:applyMainObj.discountamount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_sales_amount',value:applyMainObj.sales_amount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_amount',value:applyMainObj.tax_amount});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_type',value:applyMainObj.tax_type});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_tax_rate',value:applyMainObj.tax_rate});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_apply_total_amount',value:applyMainObj.total_amount});
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_invoice_apply_list',
        value: invoice_hiddent_listid,
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_invoice_todo_list',
        value: invoice_hiddent_listid,
      })
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_creditmemo_apply_list',value:creditmemo_hiddent_listid});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_creditmemo_todo_list',value:creditmemo_hiddent_listid});
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_mig',
        value: voucher_upload_type,
      })

      //批次開立部們
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_dept_code',
        value: voucher_dept_code,
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_class',
        value: voucher_class_code,
      })
      //20201111 walter mofify
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_userid',
        value: user_id,
      })

      var _applyId = _voucherApplyRecord.save()

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Lock Invoice
      var _idAry = invoice_hiddent_listid.split(',')
      for (var i = 0; i < _idAry.length; i++) {
        var _internalId = _idAry[i]

        if (parseInt(_internalId) > 0) {
          try {
            var values = {}
            values[_invoce_control_field_id] = _invoce_control_field_value

            var _id = record.submitFields({
              type: record.Type.INVOICE,
              id: parseInt(_internalId),
              values: values,
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true,
              },
            })
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }
        }
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Lock Credit Memo
      var _mySearch = search.load({
        id: _gw_creditmemo_detail_search_id,
      })
      var _filterArray = []
      _filterArray.push(['mainline', 'is', true])
      _filterArray.push('and')
      _filterArray.push(['createdfrom', search.Operator.ANYOF, _idAry])
      _filterArray.push('and')
      _filterArray.push([
        _creditmemo_control_field_id,
        search.Operator.IS,
        _creditmemo_control_unlock_field_value,
      ])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        var _result = JSON.parse(JSON.stringify(result))
        var _internalId = _result.id
        try {
          var values = {}
          values[
            _creditmemo_control_field_id
          ] = _creditmemo_control_lock_field_value

          var _id = record.submitFields({
            type: record.Type.CREDIT_MEMO,
            id: parseInt(_internalId),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        } catch (e) {
          console.log(e.name + ':' + e.message)
        }

        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //批次作業-END
  ////////////////////////////////////////////////////////////////////////////////////////
  function mark(
    flag,
    select_sublistId,
    select_field_id,
    select_checked_field_id
  ) {
    try {
      if (select_sublistId == 'invoicesublistid') {
        invoiceIdArray = [-1] //select_sublistId = invoicesublistid
      } else if (select_sublistId == 'creditmemosublistid') {
        creditMemoIdArray = [-1] //select_sublistId = creditmemosublistid
      }
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

          if (select_sublistId == 'invoicesublistid') {
            if (flag == true) invoiceIdArray.push(_id)
          } else if (select_sublistId == 'creditmemosublistid') {
            if (flag == true) creditMemoIdArray.push(_id)
          }
        }
      }

      if (select_sublistId == 'invoicesublistid') {
        _currentRecord.setValue({
          fieldId: 'custpage_invoice_hiddent_listid',
          value: invoiceIdArray.toString(),
          ignoreFieldChange: true,
        })
      } else if (select_sublistId == 'creditmemosublistid') {
        _currentRecord.setValue({
          fieldId: 'custpage_creditmemo_hiddent_listid',
          value: creditMemoIdArray.toString(),
          ignoreFieldChange: true,
        })
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function pageInit() {
    try {
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  return {
    pageInit: pageInit,
    mark: mark,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged,
    submitBatchProcess: submitBatchProcess,
    submitSelected: submitSelected,
    searchResults: searchResults,
  }
})
