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
  'N/format',
  'N/url',
  '../gw_common_utility/gw_common_validate_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_gwmessage_utility',
], function (
  runtime,
  dialog,
  search,
  currentRecord,
  record,
  format,
  url,
  validate,
  dateutility,
  stringutility,
  gwconfigure,
  invoiceutility,
  gwmessage
) {
  function initializeVar() { 
    _tax_diff_balance = getTaxDiffBalance()
  }

  function checkVarExists() {
    return _tax_diff_balance !== ''
  }

  function constructorWrapper(func) {
    return function () {
      if (!checkVarExists()) {
        initializeVar()
      }
      return func.apply(this, arguments)
    }
  }
  
  function getTaxDiffBalance() {
    _tax_diff_balance = stringutility.convertToFloat(
       invoiceutility.getConfigureValue('TAX_GROUP', 'TAX_DIFF_BALANCE')
    )
  }
  var _invoceFormatCode = gwconfigure.getGwVoucherFormatInvoiceCode() //35
  var _creditMemoFormatCode = gwconfigure.getGwVoucherFormatAllowanceCode()

  var _assignLogActionScriptId = gwconfigure.getGwAssignLogActionScriptId()
  var _assignLogActionDeploymentId = gwconfigure.getGwAssignLogActionDeploymentId()
  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()

  var _gwDepositVoucherRecordId = gwconfigure.getGwDepositVoucherRecord()

  //Record List
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()

  //稅別代碼
  var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數

  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
  var _credmemo_control_field_id = gwconfigure.getCredMemoControlFieldId()

  //Page Parameters
  var _invoice_hiddent_listid = 'custpage_invoice_hiddent_listid'
  var _creditmemo_hiddent_listid = 'custpage_creditmemo_hiddent_listid'
  var _deduction_egui_number_field = 'custbody_gw_creditmemo_deduction_list'
  
  var _defaultAssignLogType = 'TYPE_1'

  var _default_upload_status = 'A' //A->P->C,E

  //稅差
  var _tax_diff_balance = ''
	  
  var _item_detail_summary_error=false

  var _invoiceEditScriptId = 'customscript_gw_document_ui_list'
  var _invoiceEditDeployId = 'customdeploy_gw_document_ui_list'

  //回寫NS Invoice的發票資料
  var _gw_gui_num_start_field = 'custbody_gw_gui_num_start'
  var _gw_gui_num_end_field = 'custbody_gw_gui_num_end'
  var _gw_allowance_num_start_field = 'custbody_gw_allowance_num_start'
  var _gw_allowance_num_end_field = 'custbody_gw_allowance_num_end'

  //憑證 Information View
  var _voucher_view_script_id = 'customscript_gw_egui_ui_view'
  var _voucher_view_deploy_id = 'customdeploy_gw_egui_ui_view'

  var _current_record = currentRecord.get()

  function fieldChanged(context) {
    if (window.onbeforeunload) {
      //avoid change warning
      window.onbeforeunload = function () {
        null
      }
    }

    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)

    if (_changeFieldId == 'custpage_customer_id') {
      changeCustomerInformation(_changeFieldId)
    } else if (_changeFieldId == 'custpage_tax_type') {
      changeTaxType(_changeFieldId)
    } else if (_changeFieldId == 'custpage_invoice_type') {
      changeInvoiceType(_changeFieldId)
    } else if (_changeFieldId == 'custpage_mig_type') {
      changeMigType(_changeFieldId)
    }
  }

  //發票資料格式
  function changeMigType(changeFieldId) {
    //課稅別
    var _custpage_mig_type = _current_record.getValue({
      fieldId: changeFieldId,
    })
    //custpage_tax_rate
    var _npo_ban = _current_record.getField({ fieldId: 'custpage_npo_ban' })
    if (_custpage_mig_type === 'B2BS' || _custpage_mig_type === 'B2BE') {
      _npo_ban.isDisplay = false //不顯示捐贈碼
    } else {
      _npo_ban.isDisplay = true //顯示捐贈碼
    }
  }

  function changeInvoiceType(changeFieldId) {
    var _custpage_tax_type = 'custpage_tax_type'

    //課稅別
    var _custpage_invoice_type = _current_record.getValue({
      fieldId: changeFieldId,
    })

    //清除custpage_tax_rate
    var _changeSelectField = _current_record.getField({
      fieldId: changeFieldId,
    })

    var _changeTaxTypeField = _current_record.getField({
      fieldId: _custpage_tax_type,
    })
    _changeTaxTypeField.removeSelectOption({
      //應稅(一般稅率)
      value: '1',
    })
    _changeTaxTypeField.removeSelectOption({
      //零稅率
      value: '2',
    })
    _changeTaxTypeField.removeSelectOption({
      //免稅
      value: '3',
    })
    _changeTaxTypeField.removeSelectOption({
      //特種稅
      value: '4',
    })
    _changeTaxTypeField.removeSelectOption({
      //混合稅率
      value: '9',
    })

    if (_custpage_invoice_type == '07') {
      //一般稅發票
      _changeTaxTypeField.insertSelectOption({
        value: '1',
        text: '應稅(一般稅率)',
      })
      _changeTaxTypeField.insertSelectOption({
        value: '2',
        text: '零稅率',
      })
      _changeTaxTypeField.insertSelectOption({
        value: '3',
        text: '免稅',
      })
      _changeTaxTypeField.insertSelectOption({
        value: '9',
        text: '混合稅',
      })
    } else if (_custpage_invoice_type == '08') {
      //特種稅發票
      _changeTaxTypeField.insertSelectOption({
        value: '4',
        text: '特種稅',
      })
    }
    changeTaxType(_custpage_tax_type)
  }

  function changeTaxType(changeFieldId) {
    //課稅別
    var _custpage_tax_type = _current_record.getValue({
      fieldId: changeFieldId,
    })
    //custpage_tax_rate
    var _customs_clearance_mark_field = _current_record.getField({
      fieldId: 'custpage_customs_clearance_mark',
    })
    _customs_clearance_mark_field.isDisplay = false //顯示通關註記

    //清除custpage_tax_rate
    var _changeSelectField = _current_record.getField({
      fieldId: changeFieldId,
    })

    var _changeTaxRateField = _current_record.getField({
      fieldId: 'custpage_tax_rate',
    })
    _changeTaxRateField.removeSelectOption({
      value: '0',
    })
    _changeTaxRateField.removeSelectOption({
      value: '2',
    })
    _changeTaxRateField.removeSelectOption({
      value: '5',
    })
    _changeTaxRateField.removeSelectOption({
      value: '15',
    })

    if (_custpage_tax_type == '1') {
      //應稅(一般稅率)
      _changeTaxRateField.insertSelectOption({
        value: '5',
        text: '5',
      })
    } else if (_custpage_tax_type == '2') {
      // 零稅率
      _customs_clearance_mark_field.isDisplay = true //顯示通關註記
      _changeTaxRateField.insertSelectOption({
        value: '0',
        text: '0',
      })
    } else if (_custpage_tax_type == '3') {
      //免稅
      _changeTaxRateField.insertSelectOption({
        value: '0',
        text: '0',
      })
    } else if (_custpage_tax_type == '4') {
      //特種稅
      _changeTaxRateField.insertSelectOption({
        value: '2',
        text: '2',
      })
      _changeTaxRateField.insertSelectOption({
        value: '5',
        text: '5',
      })
      _changeTaxRateField.insertSelectOption({
        value: '15',
        text: '15',
      })
    } else if (_custpage_tax_type == '9') {
      //混合稅率
      _changeTaxRateField.insertSelectOption({
        value: '5',
        text: '5',
      })
    }
  }

  function changeCustomerInformation(changeFieldId) {
    //客戶代碼
    var _custpage_customer_id = _current_record.getValue({
      fieldId: changeFieldId,
    })

    var _entityid = ''
    var _customer_buyer_name = ''
    var _customer_buyer_email = ''
    var _customer_buyer_identifier = ''
    var _customer_address = ''

    if (_custpage_customer_id !== '') {
      var _customerRecord = record.load({
        type: record.Type.CUSTOMER,
        id: _custpage_customer_id,
        isDynamic: true,
      })
      _entityid = _customerRecord.getValue({
        fieldId: 'entityid',
      })
      _customer_buyer_name = _customerRecord.getValue({
        fieldId: 'companyname',
      })
      _customer_buyer_email = _customerRecord.getValue({
        fieldId: 'email',
      })
      _customer_buyer_identifier = _customerRecord.getValue({
        fieldId: 'vatregnumber',
      })
      _customer_address = _customerRecord.getValue({
        fieldId: 'defaultaddress',
      })
    }
    _current_record.setValue({
      fieldId: 'custpage_buyer_identifier',
      value: _customer_buyer_identifier,
      ignoreFieldChange: true,
    })
    _current_record.setValue({
      fieldId: 'custpage_buyer_name',
      value: _customer_buyer_name,
      ignoreFieldChange: true,
    })
    _current_record.setValue({
      fieldId: 'custpage_buyer_email',
      value: _customer_buyer_email,
      ignoreFieldChange: true,
    })
    _current_record.setValue({
      fieldId: 'custpage_buyer_address',
      value: _customer_address,
      ignoreFieldChange: true,
    })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
    var changeLineId = _current_record.getCurrentSublistIndex({
      sublistId: changedSubListId,
    })
    console.log('changeLineId=' + changeLineId)

    var _item_name = _current_record.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'custpage_item_name',
    })
    _current_record.setCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'custpage_item_name',
      value: _item_name,
      ignoreFieldChange: true,
    })
    console.log('_item_name=' + _item_name)
  }

  ///////////////////////////////////////////////////////////////////////////////////////////

  //欄位檢查
  function validateForm() {
    var _errorMsg = ''
    try {
      var _cash_sales_hiddent_id = _current_record.getValue({ fieldId: 'custpage_cash_sale_hiddent_listid' })
  	  var _record = record.load({
  	    type: record.Type.CASH_SALE,
  	    id: _cash_sales_hiddent_id,
  	    isDynamic: true,
      })
      var _gw_lock_transaction = _record.getValue({
          fieldId: 'custbody_gw_lock_transaction',
      })         
      if (_gw_lock_transaction==true){
      	  _errorMsg += 'EGUI已開立,'
      }
    	
      //B2BS, B2BE, B2C
      var _mig_type = _current_record.getValue({ fieldId: 'custpage_mig_type' })
      //1.請輸入商品名稱:中文30字以內, 英文60字以內
      //2.請填寫客戶公司名稱
      var _custpage_company_name = _current_record.getValue({
        fieldId: 'custpage_company_name',
      })
      if (_custpage_company_name.length == 0) {
        _errorMsg += '請填寫客戶公司名稱,'
      } else if (stringutility.checkByteLength(_custpage_company_name) > 60) {
        _errorMsg += '公司名稱長度不可超過30個中文字或60個英文字,'
      }
      //買方統編
      var _buyer_identifier = _current_record.getValue({
        fieldId: 'custpage_buyer_identifier',
      })
      //檢查統編
      if (!validate.isValidGUI(_buyer_identifier) && _buyer_identifier !='0000000000') {
          _errorMsg += '統編格式錯誤<br>'
      } 
      var _custpage_customer_id = _current_record.getValue({
        fieldId: 'custpage_customer_id',
      })
      //3.載具格式錯誤, 請輸入載具類別, 輸入統編不得使用自然人(CQ0001)載具!
      var _carrier_type = _current_record.getValue({fieldId: 'custpage_carrier_type'})
      if (_carrier_type.length !=0) _carrier_type = getCarryTypeValueByID(_carrier_type)

      if (_buyer_identifier != '0000000000' && _carrier_type === 'CQ0001') {
        _errorMsg += '輸入統編不得使用自然人(CQ0001)載具,'
      }
      ////////////////////////////////////////////////////////////////////////////////////
      //4.載具號碼錯誤! 手機條碼 自然人載具錯誤!
      var _carrier_id_1 = _current_record.getValue({
	      fieldId: 'custpage_carrier_id_1'
	  })
	  var _carrier_id_2 = _current_record.getValue({
	      fieldId: 'custpage_carrier_id_2'
	  })

      if (_carrier_type === 'CQ0001') {
        //自然人憑證
    	  if (!validate.checkCarrier(_carrier_type, _carrier_id_1) || 
	          !validate.checkCarrier(_carrier_type, _carrier_id_2)) {
	          _errorMsg += '請輸入正確自然人憑證格式<br>'
	      }
      } else if (_carrier_type === '3J0002') {
        //手機條碼
    	  if (!validate.checkCarrier(_carrier_type, _carrier_id_1) ||
	          !validate.checkCarrier(_carrier_type, _carrier_id_2)) {
	          _errorMsg += '請輸入正確手機條碼格式<br>'
	      }
      }
      if (_carrier_type !== '' && (_carrier_id_1 == '' || _carrier_id_2=='')) {
          _errorMsg += '請輸入載具號碼<br>'
      }
      if (_carrier_type == '' && (_carrier_id_1 != '' || _carrier_id_2!='')) {
          _errorMsg += '請輸入載具類別<br>'
      }
      //////////////////////////////////////////////////////////////////////////////////// 
      //5.Email格式錯誤!
      var _buyer_email = _current_record.getValue({
        fieldId: 'custpage_buyer_email',
      }) 
      if (_buyer_email.length != 0) {
        //TODO Check Format
        if (!validate.checkEmail(_buyer_email)) {
          _errorMsg += '請輸入正確Email格式,'
        }
      } 
      var _buyer_name = _current_record.getValue({
        fieldId: 'custpage_buyer_name',
      })
      if (_buyer_name.length == 0) {
        _errorMsg += '買方公司名稱不可空白,'
      }

      //5.捐贈碼Npoban: '請輸入3-7碼數字'-Done
      var _npo_ban = _current_record.getValue({
        fieldId: 'custpage_npo_ban',
      })
      if (_mig_type === 'B2C') {
        if (
          _npo_ban.length != 0 &&
          (_npo_ban.length < 3 || _npo_ban.length > 7)
        ) {
          _errorMsg += '捐贈碼請輸入3-7碼數字,'
        } else if (isNaN(_npo_ban)) {
          _errorMsg += '捐贈碼請輸入3-7碼數字,'
          _errorMsg += '捐贈碼請輸入3-7碼數字,'
        }
      } else {
        if (_npo_ban.length != 0) {
          _errorMsg += '捐贈碼不可輸入,'
        }
      }

      //6.*請選擇通關方式(零稅必填!)-Done
      var _tax_type = _current_record.getValue({
        fieldId: 'custpage_tax_type',
      })
      if (_tax_type === '2') {
        //零稅率
        var _customs_clearance_mark = _current_record.getValue({
          fieldId: 'custpage_customs_clearance_mark',
        })
        if (_customs_clearance_mark.length == 0) {
          _errorMsg += '請選擇通關方式(零稅必填!),'
        }
      }

      //7.檢查發票日期
      var _select_voucher_date = _current_record.getValue({
        fieldId: 'custpage_select_voucher_date',
      })
      if (stringutility.trim(_select_voucher_date) == '') {
        //檢查發票日期
        _errorMsg += '請選擇發票日期,'
      }
      var _formattedDate = format.format({
        value: _select_voucher_date,
        type: format.Type.DATETIME,
        timezone: format.Timezone.ASIA_TAIPEI,
      })
      var _year_month = dateutility.getTaxYearMonthByDateObj(
        _select_voucher_date
      ) //10910

      //8.檢查手開發票號碼
      //31-01
      var _egui_format_code_str = _current_record.getValue({
        fieldId: 'custpage_egui_format_code',
      })
      //手開發票號碼
      var _manual_voucher_number = _current_record.getValue({
        fieldId: 'custpage_manual_voucher_number',
      })
      if (stringutility.trim(_manual_voucher_number) != '') {
        //檢查發票號碼格式
        if (validate.validateEGUINumber(_manual_voucher_number) == false) {
          _errorMsg += '手開發票號碼格式錯誤,'
        } else {
          //檢查手開發票
          var _ban = _current_record.getValue({
            fieldId: 'custpage_company_ban',
          })
          var _track = _manual_voucher_number.substr(0, 2)
          var _inv_number = _manual_voucher_number.substr(
            2,
            _manual_voucher_number.length
          )

          var _egui_format_code_ary = _egui_format_code_str.split('-')
          var _format_code = _egui_format_code_ary[0]
          var _invoice_type = _egui_format_code_ary[1]
          if (
            invoiceutility.checkInvoiceTrackExist(
              _year_month,
              _track,
              _format_code,
              _invoice_type
            ) == false
          ) {
            _errorMsg += '手開發票字軌錯誤,'
          } else {
            if (
              invoiceutility.checkInvoiceNumberDuplicate(
                _ban,
                _manual_voucher_number
              ) == true
            ) {
              _errorMsg += '手開發票號碼重覆,'
            }
          }
        }
      }

      //9.檢查折讓單扣抵發票號碼
      var _deduction_egui_number = _current_record.getValue({
        fieldId: 'custpage_deduction_egui_number',
      })
      if (stringutility.trim(_deduction_egui_number) != '') {
        //檢查發票號碼格式
        var _deduction_egui_number_ary = _deduction_egui_number.split(',')
        for (var i = 0; i < _deduction_egui_number_ary.length; i++) {
          var _number = _deduction_egui_number_ary[i]
          if (validate.validateEGUINumber(_number) == false) {
            _errorMsg += _number + ':折讓單扣抵發票號碼格式錯誤,'
          }
        }
      }

      //檢查明細(名稱:256+明細備註:40)
      _errorMsg += checkDetailItems(_manual_voucher_number)
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _errorMsg
  }
  
  function getCarryTypeValueByID(carry_id) { 
    var _gw_ct_value = ''
    try {		  
      var _mySearch = search.create({
        type: 'customrecord_gw_carrier_type',
        columns: [ 
          search.createColumn({ name: 'custrecord_gw_ct_text' }),  
          search.createColumn({ name: 'custrecord_gw_ct_value' }) 
        ],
      })
 
      var _filterArray = []
      _filterArray.push(['internalid', 'is', carry_id])
      _mySearch.filterExpression = _filterArray
      
      _mySearch.run().each(function (result) {       		 
          _gw_ct_value = result.getValue({name: 'custrecord_gw_ct_value'})     				
          return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
	return _gw_ct_value
  }

  //檢查明細(名稱:256+明細備註:40)
  function checkDetailItems(_manual_voucher_number) {
    var _errorMsg = ''
    //Involic SubList
    var _cashSaleSublistId = 'cashsalesublistid'

    var _index_tax_code = ''
    var _check_tax_code_flag = true
    var _invoice_item_count = _current_record.getLineCount({
      sublistId: _cashSaleSublistId,
    })
    if (typeof _invoice_item_count !== 'undefined') {
      for (var i = 0; i < _invoice_item_count; i++) {
        var _invoice_id = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_id',
          line: i,
        })
        var _invoice_seq = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_seq',
          line: i,
        })
        var _tax_code = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_tax_code',
          line: i,
        })
        if (_index_tax_code == '') _index_tax_code = _tax_code
        if (_index_tax_code != _tax_code) _check_tax_code_flag = false

        var _tax_rate = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_tax_rate',
          line: i,
        })
        var _item_name = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_name',
          line: i,
        })
        var _unit_price = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_unit_price',
          line: i,
        })
        var _item_quantity = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_quantity',
          line: i,
        })
        var _item_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_amount',
          line: i,
        })
        var _item_remark = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_remark',
          line: i,
        })
        //Set value
        if (stringutility.checkByteLength(_item_name) > 256) {
          _errorMsg += _invoice_id + ':Invoice商品名稱需小於256字元,'
        } else if (stringutility.checkByteLength(_item_name) == 0) {
          _errorMsg += _invoice_id + ':Invoice商品名稱不可空白,'
        }
        if (stringutility.checkByteLength(_item_remark) > 40) {
          _errorMsg += _invoice_id + ':Invoice明細備註需小於40字元,'
        }
      }
    }

    if (
      stringutility.trim(_manual_voucher_number) != '' &&
      _invoice_item_count > 999
    ) {
      _errorMsg += _manual_voucher_number + ':筆數不可超過999筆,'
    }
    if (
      stringutility.trim(_manual_voucher_number) != '' &&
      _check_tax_code_flag == false
    ) {
      _errorMsg += _manual_voucher_number + ':不可開立不同稅別,'
    }

    return _errorMsg
  }

  //Init Company Information
  function pageInit(context) {
    _current_record.setValue({
      fieldId: 'custpage_print_type',
      value: '熱感式印表機',
      ignoreFieldChange: true,
    })

    //判斷憑證開立方式
    var _voucherOpenType = 'MERGE-INVOICE'
    _current_record.setValue({
      fieldId: 'custpage_voucher_open_type',
      value: _voucherOpenType,
      ignoreFieldChange: true,
    })
    
    var _total_amount = _current_record.getValue({
      fieldId: 'custpage_total_amount'
    })
    //小計含稅總金額
    var _sum_item_total_amount = _current_record.getValue({
      fieldId: 'custpage_sum_item_total_amount'
    })  
   	var _check_tax_diff_balance = stringutility.convertToFloat(invoiceutility.getConfigureValue('TAX_GROUP', 'TAX_DIFF_BALANCE'))
   	var _diff_amount = stringutility.convertToFloat(_total_amount)-stringutility.convertToFloat(_sum_item_total_amount)

    if (_check_tax_diff_balance < Math.abs(_diff_amount)){ 
    	_item_detail_summary_error=true
    	var _title = '憑證管理'
    	var _err_message='小計金額(含稅)['+_sum_item_total_amount+']與總金額(含稅)['+_total_amount+']不一致,請確認是否仍要開立發票'
    	gwmessage.showErrorMessage(_title, _err_message) 
    } 
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //開立發票區塊-START
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //處理憑證資料
  var _taxObjAry = []
  
  function loadAllTaxInformation() {
	_taxObjAry = invoiceutility.loadAllTaxInformation()
	/**
    try {		  
      var _mySearch = search.create({
        type: 'customrecord_gw_ap_doc_tax_type_option',
        columns: [ 
          search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_value' }), //1
          search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_text' }),  //應稅
          search.createColumn({ name: 'custrecord_gw_tax_type_tax_code' })      //TAX CODES
        ],
      })

      //var _filterArray = []
      //_filterArray.push(['custrecord_gw_voucher_group_type', 'is', _group_type])
      //_mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        var internalid = result.id
		
        var _voucher_property_id = 'TAX_TYPE'		
        var _voucher_property_value = result.getValue({
          name: 'custrecord_gw_ap_doc_tax_type_value',
        })
        var _voucher_property_note = result.getValue({
          name: 'custrecord_gw_ap_doc_tax_type_text',
        }) 
		var _netsuite_id_value = result.getValue({
          name: 'custrecord_gw_tax_type_tax_code',
        }) 
		var _netsuite_id_text = result.getText({
          name: 'custrecord_gw_tax_type_tax_code',
        }) 
		
        var _obj = {
          voucher_property_id: _voucher_property_id,
          voucher_property_value: _voucher_property_value,
          voucher_property_note: _voucher_property_note,
          netsuite_id_value: _netsuite_id_value,
          netsuite_id_text: _netsuite_id_text,
        }
		
        _taxObjAry.push(_obj)
		
        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
	*/
  }
 
  //取得稅別資料
  function getTaxInformation(netsuiteId) {
    var _taxObj
    try {
      if (_taxObjAry != null) {
        for (var i = 0; i < _taxObjAry.length; i++) {
          var _obj = JSON.parse(JSON.stringify(_taxObjAry[i]))

          if (_obj.netsuite_id_value == netsuiteId) {
            _taxObj = _obj
            break
          }
        }
      }
    } catch (e) {
      log.debug(e.name, e.message)
    }

    return _taxObj
  }

  function submitDocument(assignlogScriptId, assignlogDeploymentId) {
    try {
    	var _alert_message = '是否開立憑證'
   	    if (_item_detail_summary_error==true){ 
   	        _alert_message = '小計(含稅)金額與總金額(含稅)不一致,請確認是否仍要開立發票 !'
   	    }
   	    var options = {
   	        title: '憑證管理',
   	        message: _alert_message
   	    }
        dialog.confirm(options).then(success).catch(failure)
   	    
    } catch (e) {
      log.debug(e.name, e.message)
    }
  }

  function failure(reason) {
    console.log('cancel this task=>' + reason)
  }

  function success(reason) {
    if (reason == false) return

    //1.驗證資料
    document.getElementById('custpage_create_voucher_button').disabled = true
    document.getElementById('custpage_forward_back_button').disabled = true

    var _errorMsg = validateForm()
    
    if (_errorMsg.length != 0) {
      var _title = '憑證管理'
      gwmessage.showErrorMessage(_title, _errorMsg)
      document.getElementById('custpage_create_voucher_button').disabled = false
      document.getElementById('custpage_forward_back_button').disabled = false
      return
    }

    var _userObj = runtime.getCurrentUser()
    var _user_id = _userObj.id
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //發票處理-V2-START
    //載入稅別資料
    loadAllTaxInformation()
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //發票日期
    var _select_voucher_date = _current_record.getValue({
      fieldId: 'custpage_select_voucher_date',
    })
    //手開發票號碼
    var _manual_voucher_number = _current_record.getValue({
      fieldId: 'custpage_manual_voucher_number',
    })
    //開立方式 (EGUI, NONE)
    var _assignLogType = _current_record.getValue({
      fieldId: 'custpage_allowance_log_type',
    })
    if (stringutility.trim(_manual_voucher_number) != '') {
      _assignLogType = 'NONE' //手開發票不上傳
    }

    //開立方式==>MERGE-INVOICE, MERGE-CREDITMEMO, MERGE-ALL(INVOICE+CREDITMEMO), SINGLE(各別開)
    var _voucherOpenType = _current_record.getValue({
      fieldId: 'custpage_voucher_open_type',
    })

    //處理年月
    var _formattedDate = format.format({
      value: _select_voucher_date,
      type: format.Type.DATETIME,
      timezone: format.Timezone.ASIA_TAIPEI,
    })

    var _year_month = dateutility.getTaxYearMonthByDateObj(_select_voucher_date) //10910
    var _voucher_date = dateutility.getConvertDateByDateObj(
      _select_voucher_date
    ) //20201005

    //依照金額判斷開立方式==>整理資料每999筆1包
    var _mig_type = _current_record.getValue({ fieldId: 'custpage_mig_type' }) //B2BS, B2BE, B2C
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //取得頁面Main填寫資料(GUI或Allowance)
    var _applyMainObj = getApplyMainObject(_year_month)
    //alert('_applyMainObj='+JSON.stringify(_applyMainObj));

    //1.依稅(TaxCode)分流稅別資料(INVOICE+CREDITMEMO)混在一起
    var _jsonDocumemtLists = splitDocumentDetail(_mig_type)
    //alert('_jsonDocumemtLists='+JSON.stringify(_jsonDocumemtLists));

    //紀錄折扣項目清單及金額
    var _discountItemAry = _jsonDocumemtLists.discountItemAry

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var _eDocument_TaxType_1_Ary = _jsonDocumemtLists.eDocument_TaxType_1_Ary //1=應稅     [5]
    var _eDocument_TaxType_2_Ary = _jsonDocumemtLists.eDocument_TaxType_2_Ary //2=零稅率   [0]
    var _eDocument_TaxType_3_Ary = _jsonDocumemtLists.eDocument_TaxType_3_Ary //3=免稅     [0]
    var _eDocument_TaxType_9_Ary = _jsonDocumemtLists.eDocument_TaxType_9_Ary //9=混合稅   [1,2,5,15,25]
    //通關註記
    if (_eDocument_TaxType_2_Ary.length == 0)
      _applyMainObj.customs_clearance_mark = ''
    //判斷是否為混合稅
    var _b2cMixTaxType = '9'
    var _type1_length = _eDocument_TaxType_1_Ary.length != '0' ? '1' : '0'
    var _type2_length = _eDocument_TaxType_2_Ary.length != '0' ? '1' : '0'
    var _type3_length = _eDocument_TaxType_3_Ary.length != '0' ? '1' : '0'
    var _type_str = _type1_length + _type2_length + _type3_length
    if (_type_str == '100') _b2cMixTaxType = '1'
    else if (_type_str == '010') _b2cMixTaxType = '2'
    else if (_type_str == '001') _b2cMixTaxType = '3'

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //檢查折讓金額是否足夠-START
    //Check 應稅部分 (999分拆)
    var _organisedAry_TaxType_1 = organisingDocument(
      _applyMainObj,
      _eDocument_TaxType_1_Ary
    )
    var _guiAry_TaxType_1 = _organisedAry_TaxType_1.EGUI
    //alert('_organisedAry_TaxType_1='+JSON.stringify(_organisedAry_TaxType_1));

    //Check 零稅部分
    var _organisedAry_TaxType_2 = organisingDocument(
      _applyMainObj,
      _eDocument_TaxType_2_Ary
    )
    var _guiAry_TaxType_2 = _organisedAry_TaxType_2.EGUI

    //Check 免稅部分
    var _organisedAry_TaxType_3 = organisingDocument(
      _applyMainObj,
      _eDocument_TaxType_3_Ary
    )
    var _guiAry_TaxType_3 = _organisedAry_TaxType_3.EGUI
 
    //Check 混合稅部分
    var _organisedAry_TaxType_9 = organisingDocument(
      _applyMainObj,
      _eDocument_TaxType_9_Ary
    )
    var _guiAry_TaxType_9 = _organisedAry_TaxType_9.EGUI
    //檢查折讓金額是否足夠-END
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //計算發票筆數
    //檢查字軌張數
    var _checkInvoiceCountFlag = true
    //需求張數 _eDocument_TaxType_3_Ary
    var _requireCount =
      _guiAry_TaxType_1.length +
      _guiAry_TaxType_2.length +
      _guiAry_TaxType_3.length
    if (_mig_type == 'B2C') {
      //B2C 合併開立
      _requireCount = _guiAry_TaxType_9.length
    }

    if (_requireCount > 0 && stringutility.trim(_manual_voucher_number) == '') {
      _checkInvoiceCountFlag = checkAssignLogUseCount(
        _assignLogType,
        _applyMainObj.invoice_type,
        _applyMainObj.company_ban,
        _applyMainObj.dept_code,
        _applyMainObj.classification,
        _year_month,
        _voucher_date,
        _requireCount
      )
    }
    //檢查資料-END
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //處理資料-START
    var _cash_sale_selected_listid = _current_record.getValue({
      fieldId: 'custpage_cash_sale_hiddent_listid',
    })
    
    if (_checkInvoiceCountFlag == false) {
      var _title = '憑證管理'
      var _message = '憑證錯誤:'
      if (_checkInvoiceCountFlag == false) {
        _message += '字軌可開立張數不足或開立日期小於字軌日期,請重新確認!'
      }
      gwmessage.showErrorMessage(_title, _message)
    } else {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //處理要開發票的部分(999筆1包)-START
      var _applyId = saveVoucherApplyListRecord(
        _voucherOpenType,
        _assignLogType,
        _applyMainObj,
        _cash_sale_selected_listid,
        _user_id
      )

      if (_mig_type == 'B2C') {
        //合併開立
        //發票
        _eDocument_TaxType_1_Ary = []
        _eDocument_TaxType_2_Ary = []
        _eDocument_TaxType_3_Ary = []
        _eDocument_TaxType_1_Ary = _eDocument_TaxType_9_Ary

        //發票
        _guiAry_TaxType_1 = []
        _guiAry_TaxType_2 = []
        _guiAry_TaxType_3 = []
        _guiAry_TaxType_1 = _guiAry_TaxType_9

        for (var i = 0; i < _guiAry_TaxType_1.length; i++) {
          var _documentObj = _guiAry_TaxType_1[i]
          var _main = _documentObj.main
          _main.tax_type = _b2cMixTaxType
          _documentObj.main = _main
          _guiAry_TaxType_1[i] = _documentObj
        }
      }

      //alert('_guiAry_TaxType_1='+JSON.stringify(_guiAry_TaxType_1));
      var _eGuiCount = 0
      var _voucher_main_id = 0
      if (_eDocument_TaxType_1_Ary.length != 0) {
        //1.開發票
        var _guiNumberAry = []
        if (_guiAry_TaxType_1.length != 0) {
          //只開eGUI
          var _jsonObj = createEGUIDocument(
            _voucherOpenType,
            _assignLogType,
            _year_month,
            _applyId,
            _guiAry_TaxType_1,
            _manual_voucher_number,
            _voucher_date,
            _user_id
          )
          _guiNumberAry = _guiNumberAry.concat(_jsonObj.guiNumberAry)
          _voucher_main_id = _jsonObj.voucher_main_id
        }
        //更新筆數
        _eGuiCount += _guiNumberAry.length
      }

      if (_eDocument_TaxType_2_Ary.length != 0) {
        //開發票
        var _guiNumberAry = []
        if (_guiAry_TaxType_2.length != 0) {
          //只開eGUI
          var _jsonObj = createEGUIDocument(
            _voucherOpenType,
            _assignLogType,
            _year_month,
            _applyId,
            _guiAry_TaxType_2,
            _manual_voucher_number,
            _voucher_date,
            _user_id
          )
          _guiNumberAry = _guiNumberAry.concat(_jsonObj.guiNumberAry)
          _voucher_main_id = _jsonObj.voucher_main_id
        }
        //更新筆數
        _eGuiCount += _guiNumberAry.length
      }

      if (_eDocument_TaxType_3_Ary.length != 0) {
        //開發票
        var _guiNumberAry = []
        if (_guiAry_TaxType_3.length != 0) {
          //只開eGUI
          var _jsonObj = createEGUIDocument(
            _voucherOpenType,
            _assignLogType,
            _year_month,
            _applyId,
            _guiAry_TaxType_3,
            _manual_voucher_number,
            _voucher_date,
            _user_id
          )
          _guiNumberAry = _guiNumberAry.concat(_jsonObj.guiNumberAry)
          _voucher_main_id = _jsonObj.voucher_main_id
        }
        //更新筆數
        _eGuiCount += _guiNumberAry.length
      }
      //處理要開發票的部分(999筆1包)-END

      //更新開立張數
      updateVoucherApplyListRecord(_applyId, _eGuiCount)

      //更新流程紀錄 flow_status='1'
      if (_eGuiCount != 0) updateCashSaleFlowStatus(_guiNumberAry)
      //做完更新資料-END

      if (_eGuiCount != 0) {
        var _title = '憑證管理'
        var _message = '開立完成!'
        log.debug(_title, _message)

        gwmessage.showInformationMessage(_title, _message)

        ///////////////////////////////////////////////////////////////////
        //forward to egui View
        var _params = {
          voucher_type: 'EGUI',
          voucher_internal_id: _voucher_main_id,
        }

        window.location = url.resolveScript({
          scriptId: _voucher_view_script_id,
          deploymentId: _voucher_view_deploy_id,
          params: _params,
          returnExternalUrl: false,
        })
        ///////////////////////////////////////////////////////////////////
      }
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    document.getElementById('custpage_forward_back_button').disabled = false
  }

  function updateVoucherApplyListRecord(applyID, guiCount) {
    var _voucherApplyListRecord = record.load({
      type: _voucher_apply_list_record,
      id: parseInt(applyID),
      isDynamic: true,
    })

    _voucherApplyListRecord.setValue({
      fieldId: 'custrecord_gw_gui_created_count',
      value: guiCount,
    })

    try {
      _voucherApplyListRecord.save()
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function getInvoiceMigType(migType) {
    var _mig = ''
    if (migType === 'B2BS') {
      //B2B存證
      //_mig = 'A0401';
      _mig = 'C0401'
    } else if (migType === 'B2BE') {
      //B2B交換
      _mig = 'A0101'
    } else if (migType === 'B2C') {
      _mig = 'C0401'
    }
    return _mig
  }

  function getAllowanceMigType(migType) {
    var _mig = ''
    if (migType === 'B2BS') {
      //B2B存證
      //_mig = 'B0401';
      _mig = 'D0401'
    } else if (migType === 'B2BE') {
      //B2B交換
      _mig = 'B0101'
    } else if (migType === 'B2C') {
      _mig = 'D0401'
    }
    return _mig
  }

  function getApplyMainObject(year_month) {
    var _applyId = 0
    //2.取得頁面填寫資料(GUI或Allowance)
    var _company_ban = _current_record.getValue({
      fieldId: 'custpage_company_ban',
    })
    var _company_name = _current_record.getValue({
      fieldId: 'custpage_company_name',
    })
    var _company_address = _current_record.getValue({
      fieldId: 'custpage_company_address',
    })
    var _invoice_type = _current_record.getValue({
      fieldId: 'custpage_invoice_type',
    })
    var _print_type = _current_record.getValue({
      fieldId: 'custpage_print_type',
    })
    var _mig_type = _current_record.getValue({ fieldId: 'custpage_mig_type' })
    var _main_remark = _current_record.getValue({
      fieldId: 'custpage_main_remark',
    })
    var _customer_id = _current_record.getValue({
      fieldId: 'custpage_customer_id',
    })
    var _buyer_identifier = _current_record.getValue({
      fieldId: 'custpage_buyer_identifier',
    })
    var _buyer_name = _current_record.getValue({
      fieldId: 'custpage_buyer_name',
    })
    if (stringutility.trim(_buyer_name) == '') _buyer_name = _buyer_identifier

    var _buyer_email = _current_record.getValue({
      fieldId: 'custpage_buyer_email',
    })
    var _buyer_address = _current_record.getValue({
      fieldId: 'custpage_buyer_address',
    })
    var _carrier_type = _current_record.getValue({
      fieldId: 'custpage_carrier_type',
    })
    if (_carrier_type.length !=0) _carrier_type = getCarryTypeValueByID(_carrier_type)
    
    var _carrier_id_1 = _current_record.getValue({
      fieldId: 'custpage_carrier_id_1'
    })
    var _carrier_id_2 = _current_record.getValue({
      fieldId: 'custpage_carrier_id_2'
    }) 
    var _npo_ban = _current_record.getValue({ fieldId: 'custpage_npo_ban' })
    var _customs_clearance_mark = _current_record.getValue({
      fieldId: 'custpage_customs_clearance_mark',
    })
    var _dept_code = _current_record.getValue({ fieldId: 'custpage_dept_code' })
    var _classification = _current_record.getValue({
      fieldId: 'custpage_classification',
    })
    var _tax_type = _current_record.getValue({ fieldId: 'custpage_tax_type' })
    var _tax_rate = _current_record.getValue({ fieldId: 'custpage_tax_rate' })
    var _discountamount = _current_record.getValue({
      fieldId: 'custpage_sales_discount_amount',
    }) //折扣總金額(未稅)
    var _tax_amount = _current_record.getValue({
      fieldId: 'custpage_tax_amount',
    })
    var _sales_amount = _current_record.getValue({
      fieldId: 'custpage_sales_amount',
    })
    var _total_amount = _current_record.getValue({
      fieldId: 'custpage_total_amount',
    })
    var _gui_yearmonth_type = _current_record.getValue({
      fieldId: 'custpage_allowance_deduction_period',
    })
    //手開發票號碼
    var _manual_voucher_number = _current_record.getValue({
      fieldId: 'custpage_manual_voucher_number',
    })

    var _format_code = _invoceFormatCode //35
    //手開發票格式代號 31-01
    var _egui_format_code = _current_record.getValue({
      fieldId: 'custpage_egui_format_code',
    })
    if (stringutility.trim(_manual_voucher_number) != '') {
      var _format_code_ary = _egui_format_code.split('-')
      _format_code = _format_code_ary[0]
      _invoice_type = _format_code_ary[1]
    }

    //this_period:當期, early_period:前期
    var _applyMainObj = {
      applyID: _applyId.toString(),
      company_ban: _company_ban,
      company_name: _company_name,
      company_address: _company_address,
      invoice_type: _invoice_type,
      print_type: _print_type,
      mig_type: _mig_type,
      main_remark: _main_remark,
      customer_id: _customer_id,
      buyer_identifier: _buyer_identifier,
      buyer_name: _buyer_name,
      buyer_email: _buyer_email,
      buyer_address: _buyer_address,
      carrier_type: _carrier_type,
      carrier_id_1: _carrier_id_1,
      carrier_id_2: _carrier_id_2,
      npo_ban: _npo_ban,
      customs_clearance_mark: _customs_clearance_mark,
      gui_yearmonth_type: _gui_yearmonth_type,
      dept_code: _dept_code,
      classification: _classification,
      year_month: year_month,
      tax_type: _tax_type,
      tax_rate: _tax_rate,
      discountamount: _discountamount,
      tax_amount: _tax_amount,
      sales_amount: 0,
      free_sales_amount: 0,
      zero_sales_amount: 0,
      total_amount: _total_amount,
      manual_voucher_number: _manual_voucher_number,
      egui_format_code: _format_code,
      voucher_open_type: 'SINGLE', //先設 default value
    }

    return _applyMainObj
  }

  function saveVoucherApplyListRecord(
    openType,
    assignLogType,
    applyMainObj,
    cashsale_hiddent_listid,
    user_id
  ) {
    var _applyId = 0
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //this_period:當期, early_period:前期
    var _voucher_apply_atatus = 'P'
    var _closed_voucher = 'N'

    var _voucherApplyRecord = record.create({
      type: _voucher_apply_list_record,
      isDynamic: true,
    })

    _voucherApplyRecord.setValue({ fieldId: 'name', value: 'VoucherApply' })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_type',
      value: 'APPLY',
    }) //APPLY (開立) / VOID (作廢)
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_open_type',
      value: openType,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_date',
      value: new Date(),
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_time',
      value: dateutility.getCompanyLocatTimeForClient(),
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_yearmonth',
      value: applyMainObj.year_month,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_seller',
      value: applyMainObj.company_ban,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_seller_name',
      value: applyMainObj.company_name,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_buyer',
      value: applyMainObj.buyer_identifier,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_buyer_name',
      value: applyMainObj.buyer_name,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_dept_code',
      value: applyMainObj.dept_code,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_dept_name',
      value: applyMainObj.dept_code,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_class',
      value: applyMainObj.classification,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_invoice_type',
      value: applyMainObj.invoice_type,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_mig_type',
      value: applyMainObj.mig_type,
    })
    //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_gui_yearmonth_type',value:applyMainObj.gui_yearmonth_type});
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_status',
      value: _voucher_apply_atatus,
    })

    //作廢時使用
    //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_void_comment',value:dateutility.getCompanyLocatDateForClient()});
    //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_approve_comment',value:dateutility.getCompanyLocatTimeForClient()});
    //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_flow_status',value:_yearMonth});
    //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_source_apply_internal_id',value:_yearMonth});

    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_closed_voucher',
      value: _closed_voucher,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_discountamount',
      value: applyMainObj.discountamount,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_sales_amount',
      value: applyMainObj.sales_amount,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_tax_amount',
      value: applyMainObj.tax_amount,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_tax_type',
      value: applyMainObj.tax_type,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_tax_rate',
      value: applyMainObj.tax_rate,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_total_amount',
      value: applyMainObj.total_amount,
    })
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_cashsale_apply_list',
      value: cashsale_hiddent_listid,
    })
    if (stringutility.trim(applyMainObj.manual_voucher_number) == '') {
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_mig',
        value: 'Y',
      })
    } else {
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_mig',
        value: 'N',
      })
    }
    //20201109 walter mofify
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_voucher_apply_userid',
      value: user_id,
    })

    try {
      _applyId = _voucherApplyRecord.save()
      applyMainObj.applyID = _applyId
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _applyId
  }

  //整理資料每999筆1包
  /**
   * eGuiMainObj              : 表頭資料
   * itemAry                  : Item 資料
   */
  function organisingDocument(eGuiMainObj, itemAry) {
    //取得發票號碼
    var _voucher_type = 'EGUI'
    var _ns_document_type = 'INVOICE'

    var _salesAmountSum = 0
    var _freeSalesAmountSum = 0
    var _zeroSalesAmountSum = 0
    var _taxAmountSum = 0
    var _totalAmountSum = 0
    var _creditMemoTotalAmountSum = 0

    var _guiAry = []
    var _creditMemoAry = []

    var _itemDetails = []
    ////////////////////////////////////////////////////////////////////////////////////
    //1.處理資料=>每999筆開一張發票或折讓單
    var _positive = false
    var _negative = false
    var _tempCheckAry = []
    if (typeof itemAry !== 'undefined') {
      for (var i = 0; i < itemAry.length; i++) {
        var _obj = itemAry[i]

        var _check_document_id = _obj.document_type + _obj.invoice_number
        _itemDetails.push(_obj)

        //alert('_obj.document_type='+_obj.document_type);
        if (
          stringutility.convertToFloat(_obj.item_amount) >= 0 &&
          _obj.document_type != 'CREDITMEMO'
        ) {
          _positive = true
        } else {
          _negative = true
        }

        var _taxObj = getTaxInformation(_obj.tax_code)
        if (_taxObj.voucher_property_value == '1') {
          //with tax
          _salesAmountSum += stringutility.convertToFloat(_obj.item_amount)
        } else if (_taxObj.voucher_property_value == '2') {
          //zero
          _zeroSalesAmountSum += stringutility.convertToFloat(_obj.item_amount)
        } else if (_taxObj.voucher_property_value == '3') {
          //free
          _freeSalesAmountSum += stringutility.convertToFloat(_obj.item_amount)
        } else {
          _salesAmountSum += stringutility.convertToFloat(_obj.item_amount)
        }

        if (itemAry.length > 999) {
          //超過999筆只能這樣算
          _taxAmountSum += (
            (stringutility.convertToFloat(_obj.item_amount) *
              stringutility.convertToFloat(_obj.tax_rate)) /
            100
          ).toFixed(_numericToFixed)
          //總計金額
          _totalAmountSum =
            _salesAmountSum +
            _zeroSalesAmountSum +
            _freeSalesAmountSum +
            _taxAmountSum
        } else {
          if (_tempCheckAry.toString().indexOf(_check_document_id) == -1) {
            _tempCheckAry.push(_check_document_id)
            //alert('total_tax_amount='+_obj.total_tax_amount+' total_sum_amount = '+_obj.total_sum_amount);
            _taxAmountSum += stringutility.convertToFloat(_obj.total_tax_amount)
            _totalAmountSum += stringutility.convertToFloat(
              _obj.total_sum_amount
            )
          }
        }

        if (i == itemAry.length - 1 || _itemDetails.length == 999) {
          //每999筆開一張發票
          var _main = JSON.parse(JSON.stringify(eGuiMainObj))
          var _details = JSON.parse(JSON.stringify(_itemDetails))

          _main.tax_type = _obj.tax_type
          //_main.dept_code         = _obj.deptcode;
          //_main.classification    = _obj.classification;
          _main.tax_rate = _obj.tax_rate
          _main.zero_sales_amount = _zeroSalesAmountSum.toFixed(_numericToFixed)
          _main.free_sales_amount = _freeSalesAmountSum.toFixed(_numericToFixed)
          _main.sales_amount = _salesAmountSum.toFixed(_numericToFixed)

          _main.tax_amount = _taxAmountSum.toFixed(_numericToFixed)
          _main.total_amount = _totalAmountSum.toFixed(_numericToFixed)

          if (_positive == true && _negative == true) {
            _main.voucher_open_type = 'MIX'
          } else if (_positive == true && _negative == false) {
            _main.voucher_open_type = 'SINGLE'
          } else if (_positive == false && _negative == true) {
            _main.voucher_open_type = 'SINGLE'
          }

          var _itemAry = {
            main: _main,
            details: _details,
          }
          if (_totalAmountSum > 0) {
            //開發票
            _guiAry.push(_itemAry)
          } else if (_totalAmountSum < 0) {
            //開折讓單
            _creditMemoAry.push(_itemAry)
            //紀錄累積折讓金額(未稅)
            _creditMemoTotalAmountSum +=
              _salesAmountSum + _zeroSalesAmountSum + _freeSalesAmountSum
          } else {
            //alert('金額為0無須開立!');
            //0元也要開發票
            _guiAry.push(_itemAry)
          }

          _itemDetails.length = 0 // remove all item
          _salesAmountSum = 0
          _zeroSalesAmountSum = 0
          _freeSalesAmountSum = 0
          _taxAmountSum = 0
          _totalAmountSum = 0
          _positive = false
          _negative = false
        }
      }
    }

    var _resultObj = {
      CREDITMEMO_TOTAL_AMOUNT: _creditMemoTotalAmountSum,
      EGUI: _guiAry,
      CREDITMEMO: _creditMemoAry,
    }

    return _resultObj
  }

  //開立發票
  /**
   * applyId     : 申請單號
   * taxCode     : 稅別
   * eGuiMainObj : 表頭資料
   * itemAry     : Item 資料
   */
  function createEGUIDocument(
    openType,
    assignLogType,
    year_month,
    applyId,
    documentAry,
    manual_voucher_number,
    voucher_date,
    user_id
  ) {
    //取得發票號碼 TODO
    var _guiNumberAry = []
    var _mainRecordId = 0
    var _voucher_type = 'EGUI'

    var _row = 0
    var _groupID = 0
    var _status = 'VOUCHER_SUCCESS' //2:開立成功, 3:作廢成功
    var _documentDate = voucher_date
    var _documentTime = dateutility.getCompanyLocatTimeForClient()

    var _applyPeriod = invoiceutility.getApplyPeriodOptionId(year_month)

    var _salesAmountSum = 0
    var _taxAmountSum = 0
    var _totalAmountSum = 0

    if (typeof documentAry !== 'undefined') {
      for (var i = 0; i < documentAry.length; i++) {
        var _documentObj = documentAry[i]
        var _main = _documentObj.main
        var _details = _documentObj.details
        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        //20201113 walter modify 檢查稅差
        /**
           var _tax_diff_error = false;
           var _ns_sales_amount = stringutility.convertToFloat(_main.sales_amount);
           //_ns_tax_rate=0.05
           var _ns_tax_rate     = stringutility.convertToFloat(_main.tax_rate)/100;
           var _ns_tax_amount   = stringutility.convertToFloat(_main.tax_amount);
           if (_tax_diff_balance < 999) {
					 _tax_diff_error = invoiceutility.checkTaxDifference(_ns_sales_amount, _ns_tax_rate, _ns_tax_amount, _tax_diff_balance);
				 }
           */
        var _tax_diff_error = checkVoucherTaxDifference(_details)
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        //20201113 walter modify
        if (_tax_diff_error == true) {
          var _title = '發票管理'
          var _message = '稅差超過(' + _tax_diff_balance + ')元 ,請重新調整!'
          gwmessage.showErrorMessage(_title, _message)
          break
        }
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //取得發票號碼 TODO
        //統編[24549210]+部門代碼[2]+期數[10908]
        var _invoiceNumber = ''
        if (stringutility.trim(manual_voucher_number) != '') {
          _invoiceNumber = manual_voucher_number
        } else {
         /**	
          _invoiceNumber = invoiceutility.getAssignLogNumber(
            _main.invoice_type,
            _main.company_ban,
            _main.dept_code,
            _main.classification,
            year_month,
            assignLogType,
            _documentDate
          )
          */
          _invoiceNumber = invoiceutility.getAssignLogNumberAndCheckDuplicate(
				            -1,
				            _main.invoice_type,
				            _main.company_ban,
				            _main.dept_code,
				            _main.classification,
				            year_month,
				            assignLogType,
				            _documentDate
				          )
        }

        if (_invoiceNumber.length == 0 || _invoiceNumber == 'BUSY') {
          var _title = '字軌管理'
          var _message ='無本期(' + year_month + ')字軌請匯入或日期小於字軌日期!'
          if (_invoiceNumber == 'BUSY'){
        	  _title   = '憑證管理'
        	  _message ='本期(' + year_month + ')字軌使用忙碌,請稍後再開立!'
          }
          gwmessage.showErrorMessage(_title, _message)

          break
        } else {
          _guiNumberAry.push(_invoiceNumber)
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////
          var _voucherMainRecord = record.create({
            type: _voucher_main_record,
            isDynamic: true,
          })

          _voucherMainRecord.setValue({
            fieldId: 'name',
            value: 'VoucherMainRecord',
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_apply_internal_id',
            value: applyId.toString(),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_type',
            value: _voucher_type,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_number',
            value: _invoiceNumber,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_date',
            value: _documentDate,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_time',
            value: _documentTime,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_yearmonth',
            value: year_month,
          })
          //20201230 walter modify
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_voucher_sale_tax_apply_period',
            value: _applyPeriod,
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_seller',
            value: _main.company_ban,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_seller_name',
            value: _main.company_name,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_seller_address',
            value: stringutility.trim(_main.company_address),
          })
          //20201030 walter modify
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_original_buyer_id',
            value: stringutility.trim(_main.customer_id),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_buyer',
            value: _main.buyer_identifier,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_buyer_name',
            value: _main.buyer_name,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_buyer_address',
            value: stringutility.trim(_main.buyer_address),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_buyer_email',
            value: stringutility.trim(_main.buyer_email),
          })
          //_voucherMainRecord.setValue({fieldId:'custrecord_gw_buyer_dept_code',value:_main.dept_code});	//暫時不用
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_dept_code',
            value: stringutility.trim(_main.dept_code),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_dept_name',
            value: stringutility.trim(_main.dept_code),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_classification',
            value: stringutility.trim(_main.classification),
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_invoice_type',
            value: stringutility.trim(_main.invoice_type),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_mig_type',
            value: stringutility.trim(_main.mig_type),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_format_code',
            value: stringutility.trim(_main.egui_format_code),
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_carrier_type',
            value: stringutility.trim(_main.carrier_type),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_carrierid1',
            value: stringutility.trim(_main.carrier_id_1),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_carrierid2',
            value: stringutility.trim(_main.carrier_id_2),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_npoban',
            value: stringutility.trim(_main.npo_ban),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_clearance_mark',
            value: stringutility.trim(_main.customs_clearance_mark),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_main_remark',
            value: stringutility.trim(_main.main_remark),
          })

          var _print_mark = 'N'
          //捐贈碼 OR 載具編號
          if (
            (_main.mig_type == 'C0401' || _main.mig_type == 'B2C') &&
            stringutility.trim(_main.npo_ban) == '' &&
            stringutility.trim(_main.carrier_type) == ''
          ) {
            //TODO 要產生隨機碼
            _print_mark = 'Y'
          }
          
          var _random_number = invoiceutility.getRandomNumNew(_invoiceNumber, _main.company_ban)
          //var _random_number = Math.round(invoiceutility.getRandomNum(1000, 9999))
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_random_number',
            value: _random_number,
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_print_mark',
            value: _print_mark,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_is_printed',
            value: 'N',
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_lock_transaction',
            value: true,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_discount_amount',
            value: 0,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_discount_count',
            value: '0',
          })
          //_voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_owner',value:'1'}); //折讓單專用欄位(1:買方, 2賣方)
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_status',
            value: _status,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_upload_status',
            value: _default_upload_status,
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_sales_amount',
            value: stringutility.convertToFloat(_main.sales_amount),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_free_sales_amount',
            value: stringutility.convertToFloat(_main.free_sales_amount),
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_zero_sales_amount',
            value: stringutility.convertToFloat(_main.zero_sales_amount),
          })

          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_tax_amount',
            value: _main.tax_amount,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_tax_type',
            value: _main.tax_type,
          })
          var _main_tax_rate =
            stringutility.convertToFloat(_main.tax_rate) / 100
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_tax_rate',
            value: _main_tax_rate,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_total_amount',
            value: _main.total_amount,
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_need_upload_egui_mig',
            value: assignLogType,
          })
          //20201105 walter modify
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_voucher_main_apply_user_id',
            value: user_id,
          })

          try {
            _mainRecordId = _voucherMainRecord.save()
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }

          var _gw_ns_document_apply_id_ary = []
		  
          if (typeof _details !== 'undefined') {
            for (var j = 0; j < _details.length; j++) {
              var _obj = _details[j]

              var _voucherDetailRecord = record.create({
                type: _voucher_details_record,
                isDynamic: true,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'name',
                value: 'VoucherDetailRecord',
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_apply_internal_id',
                value: applyId.toString(),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_voucher_main_internal_id',
                value: _mainRecordId.toString(),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_type',
                value: _voucher_type,
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_description',
                value: stringutility.trim(_obj.item_name),
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_unit_price',
                value: stringutility.trim(_obj.unit_price),
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_unit',
                value: stringutility.trim(_obj.item_unit),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_quantity',
                value: stringutility.trim(_obj.item_quantity),
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_amount',
                value: stringutility.trim(_obj.item_amount),
              })
              //20201105 walter modify
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_tax_amount',
                value: stringutility.trim(_obj.item_tax_amount),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_total_amount',
                value: stringutility.trim(_obj.item_total_amount),
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_item_tax_code',
                value: stringutility.trim(_obj.tax_code),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_item_tax_rate',
                value: stringutility.trim(_obj.tax_rate),
              })

              _row++
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_seq',
                value: _row.toString(),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_item_remark',
                value: stringutility.trim(_obj.item_remark),
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_number',
                value: _invoiceNumber,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_date',
                value: _documentDate,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_time',
                value: _documentTime,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_yearmonth',
                value: year_month,
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_status',
                value: _status,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_upload_status',
                value: _default_upload_status,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_type',
                value: _obj.document_type,
              })

              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_apply_id',
                value: _obj.invoice_id,
              })
              
              if (_gw_ns_document_apply_id_ary.toString().indexOf(_obj.invoice_id) == -1) {
            	  _gw_ns_document_apply_id_ary.push(_obj.invoice_id)
              } 
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_number',
                value: _obj.invoice_number,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_item_id',
                value: _obj.invoice_seq,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_items_seq',
                value: _obj.invoice_seq,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_item_discount_amount',
                value: '0',
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_item_discount_count',
                value: '0',
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_dtl_voucher_apply_period',
                value: _applyPeriod,
              })

              try {
                var callId = _voucherDetailRecord.save()
              } catch (e) {
                console.log(e.name + ':' + e.message)
              }
            }

            try {
              var values = {}
              values['custrecord_gw_is_completed_detail'] = true
			  values['custrecord_gw_ns_transaction'] = _gw_ns_document_apply_id_ary.toString() 
			  
              var _id = record.submitFields({
                type: _voucher_main_record,
                id: _mainRecordId,
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
          //End Details
        }
      }
    }
    var _jsonObj = {
      voucher_main_id: _mainRecordId,
      guiNumberAry: _guiNumberAry,
    }
    return _jsonObj
  }

  //檢查稅差
  function checkVoucherTaxDifference(details) {
    var _tax_diff_error = false
    try {
      var _ns_tax_rate = 0
      var _ns_sales_amount = 0
      var _ns_tax_amount = 0
      if (typeof details !== 'undefined') {
        for (var i = 0; i < details.length; i++) {
          var _obj = details[i]

          var _item_amount = _obj.item_amount
          var _item_tax_amount = _obj.item_tax_amount
          var _item_total_amount = _obj.item_total_amount
          var _item_tax_rate = _obj.tax_rate //5.00

          //紀錄NS應稅金額
          if (stringutility.convertToFloat(_item_tax_rate) != 0) {
            _ns_sales_amount += stringutility.convertToFloat(_item_amount)
            _ns_tax_rate = stringutility.convertToFloat(_item_tax_rate) / 100
          }
          //紀錄NS的稅額
          _ns_tax_amount += stringutility.convertToFloat(_item_tax_amount)
        }
      }
      //alert('_ns_sales_amount='+_ns_sales_amount+' ,_ns_tax_rate='+_ns_tax_rate+' ,_ns_tax_amount='+_ns_tax_amount+' ,_tax_diff_balance='+_tax_diff_balance);
      if (_tax_diff_balance < 999) {
        _tax_diff_error = invoiceutility.checkTaxDifference(
          _ns_sales_amount,
          _ns_tax_rate,
          _ns_tax_amount,
          _tax_diff_balance
        )
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _tax_diff_error
  }

  //整理發票
  function meargeHistoryEGUI(historyEGUIItems) {
    var _tempAry = []
    try {
      if (typeof historyEGUIItems !== 'undefined') {
        for (var i = 0; i < historyEGUIItems.length; i++) {
          var _eguiObj = historyEGUIItems[i]
          var _voucher_number = _eguiObj.voucher_number

          if (_tempAry.length == 0) {
            _tempAry.push(_eguiObj)
          } else {
            var _isExist = false
            for (var j = 0; j < _tempAry.length; j++) {
              var _tempObj = _tempAry[j]
              var _temp_voucher_number = _tempObj.voucher_number

              if (_temp_voucher_number == _voucher_number) {
                //_tempObj.discount_count = stringutility.convertToInt(_tempObj.discount_count) + stringutility.convertToInt(_eguiObj.discount_count);

                _tempObj.deduction_amount =
                  stringutility.convertToFloat(_tempObj.deduction_amount) +
                  stringutility.convertToFloat(_eguiObj.deduction_amount)

                _tempObj.discount_sales_amount =
                  stringutility.convertToFloat(_tempObj.discount_sales_amount) +
                  stringutility.convertToFloat(_eguiObj.discount_sales_amount)
                _tempObj.discount_zero_amount =
                  stringutility.convertToFloat(_tempObj.discount_zero_amount) +
                  stringutility.convertToFloat(_eguiObj.discount_zero_amount)
                _tempObj.discount_free_amount =
                  stringutility.convertToFloat(_tempObj.discount_free_amount) +
                  stringutility.convertToFloat(_eguiObj.discount_free_amount)

                _tempObj.discount_amount =
                  stringutility.convertToFloat(_tempObj.discount_sales_amount) +
                  stringutility.convertToFloat(_tempObj.discount_zero_amount) +
                  stringutility.convertToFloat(_tempObj.discount_free_amount)

                _tempAry[j] = _tempObj
                _isExist = true

                break
              }
            }
            if (_isExist == false) {
              _tempAry.push(_eguiObj)
            }
          }
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _tempAry
  }

  //將資料依稅別分流
  function splitDocumentDetail(mig_type) {
    //判斷處理方式
    var _accessType = ''

    var _cashSaleSublistId = 'cashsalesublistid'

    var _amount_TaxType_1 = 0 //1=應稅   [1]
    var _amount_TaxType_1_1 = 0 //1=應稅   [1]
    var _amount_TaxType_1_2 = 0 //1=應稅   [2]
    var _amount_TaxType_1_5 = 0 //1=應稅   [5]
    var _amount_TaxType_1_15 = 0 //1=應稅   [15]
    var _amount_TaxType_1_25 = 0 //1=應稅   [25]

    var _amount_TaxType_2 = 0 //2=零稅率 [0]
    var _amount_TaxType_3 = 0 //3=免稅   [0]

    var _eDocument_TaxType_1_Ary = [] //1=應稅 [5], 特種稅率 [1, 2, 5, 15, 25]
    var _eDocument_TaxType_2_Ary = [] //2=零稅率 [0]
    var _eDocument_TaxType_3_Ary = [] //3=免稅 [0]

    var _amount_TaxType_9 = 0 //9=混合稅   [0]
    var _eDocument_TaxType_9_Ary = [] //9=混合稅   [0]

    var _discountItemAry = [] //折扣項目
    var _invoice_type = _current_record.getValue({
      fieldId: 'custpage_invoice_type',
    }) //07, 08
    var _buyer_identifier = _current_record.getValue({
      fieldId: 'custpage_buyer_identifier',
    }) //買方統編
    var _invoice_item_count = _current_record.getLineCount({
      sublistId: _cashSaleSublistId,
    })
    if (typeof _invoice_item_count !== 'undefined' && _invoice_item_count > 0) {
      _accessType = 'INVOICE' //accessType=INVOICE[只處理Invoice]
      for (var i = 0; i < _invoice_item_count; i++) {
        var _invoice_id = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_id',
          line: i,
        })
        var _invoice_number = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_number',
          line: i,
        })

        var _invoice_seq = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_seq',
          line: i,
        })
        var _tax_code = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_tax_code',
          line: i,
        })
        var _deptcode = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_deptcode',
          line: i,
        })
        var _class = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_class',
          line: i,
        })
        var _discount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_discount',
          line: i,
        })
        var _tax_rate = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'customer_search_cashsale_tax_rate',
          line: i,
        })
        var _item_name = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_name',
          line: i,
        })
        var _unit_price = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_unit_price',
          line: i,
        })
        var _item_quantity = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_quantity',
          line: i,
        })
        var _item_unit = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_cashsale_item_unit',
          line: i,
        })
        var _item_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_amount',
          line: i,
        })
        var _item_remark = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_item_remark',
          line: i,
        })
        var _item_tax_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_cashsale_item_tax_amount',
          line: i,
        })
        var _item_total_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_cashsale_item_total_amount',
          line: i,
        })

        var _total_tax_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_cashsale_total_tax_amount',
          line: i,
        })
        var _total_sum_amount = _current_record.getSublistValue({
          sublistId: _cashSaleSublistId,
          fieldId: 'custpage_cashsale_total_sum_amount',
          line: i,
        })

        var _document_type = 'CASH_SALE'

        //alert('_total_tax_amount='+_total_tax_amount+' ,_total_sum_amount='+_total_sum_amount);
        //目前taxCode=10 [應稅] , taxCode=5 [免稅] ,
        //1=應稅 [1, 2, 5, 15, 25]
        //2=零稅率 [0]
        //3=免稅   [0]
        var _taxObj = getTaxInformation(_tax_code)
        var _obj = {
          invoice_id: _invoice_id,
          invoice_number: _invoice_number,
          invoice_seq: _invoice_seq,
          tax_type: _taxObj.voucher_property_value,
          deptcode: stringutility.trim(_deptcode),
          classification: stringutility.trim(_class),
          discount: stringutility.trim(_discount),
          tax_code: _tax_code,
          tax_rate: _tax_rate,
          item_name: _item_name,
          unit_price: _unit_price,
          item_quantity: _item_quantity,
          item_unit: _item_unit,
          item_amount: _item_amount,
          document_type: _document_type,
          item_remark: _item_remark,
          total_tax_amount: _total_tax_amount,
          total_sum_amount: _total_sum_amount,
          item_tax_amount: _item_tax_amount,
          item_total_amount: _item_total_amount,
        }
        //alert('item obj='+JSON.stringify(_obj));
        if (_taxObj.voucher_property_value == '3') {
          //3=免稅 [0]
          _eDocument_TaxType_3_Ary.push(_obj)
          _amount_TaxType_3 += stringutility.convertToFloat(_item_amount)
        } else if (_taxObj.voucher_property_value == '2') {
          //2=零稅率 [0]
          _eDocument_TaxType_2_Ary.push(_obj)
          _amount_TaxType_2 += stringutility.convertToFloat(_item_amount)
        } else if (_taxObj.voucher_property_value == '1') {
          //1=應稅 [5]
          _eDocument_TaxType_1_Ary.push(_obj)
          _amount_TaxType_1 += stringutility.convertToFloat(_item_amount)

          //紀錄特種稅
          if (stringutility.convertToInt(_tax_rate) == 1) {
            _amount_TaxType_1_1 += stringutility.convertToFloat(_item_amount)
          } else if (stringutility.convertToInt(_tax_rate) == 2) {
            _amount_TaxType_1_2 += stringutility.convertToFloat(_item_amount)
          } else if (stringutility.convertToInt(_tax_rate) == 5) {
            _amount_TaxType_1_5 += stringutility.convertToFloat(_item_amount)
          } else if (stringutility.convertToInt(_tax_rate) == 15) {
            _amount_TaxType_1_15 += stringutility.convertToFloat(_item_amount)
          } else if (stringutility.convertToInt(_tax_rate) == 25) {
            _amount_TaxType_1_25 += stringutility.convertToFloat(_item_amount)
          }
        }
        if (mig_type == 'B2C') {
          _eDocument_TaxType_9_Ary.push(_obj)
          _amount_TaxType_9 += stringutility.convertToFloat(_item_amount)
        }
      }
    }

    var _jsonDocumemtLists = {
      accessType: _accessType,
      discountItemAry: _discountItemAry,
      amount_TaxType_1: _amount_TaxType_1,
      amount_TaxType_1_1: _amount_TaxType_1_1, //紀錄特種稅
      amount_TaxType_1_2: _amount_TaxType_1_2, //紀錄特種稅
      amount_TaxType_1_5: _amount_TaxType_1_5, //紀錄特種稅
      amount_TaxType_1_15: _amount_TaxType_1_15, //紀錄特種稅
      amount_TaxType_1_25: _amount_TaxType_1_25, //紀錄特種稅
      amount_TaxType_2: _amount_TaxType_2,
      amount_TaxType_3: _amount_TaxType_3,
      amount_TaxType_9: _amount_TaxType_9,
      eDocument_TaxType_1_Ary: _eDocument_TaxType_1_Ary, //1=應稅 [5]
      eDocument_TaxType_2_Ary: _eDocument_TaxType_2_Ary, //2=零稅率 [0]
      eDocument_TaxType_3_Ary: _eDocument_TaxType_3_Ary, //3=免稅 [0]
      eDocument_TaxType_9_Ary: _eDocument_TaxType_9_Ary, //9=混合 [1,2,5,15,25]
    }

    return _jsonDocumemtLists
  }

  //大數相加
  function add(str1, str2) {
    var arr1 = str1.split(''),
      arr2 = str2.split(''),
      extra = false,
      sum,
      res = ''
    while (arr1.length || arr2.length || extra) {
      sum = ~~arr1.pop() + ~~arr2.pop() + extra
      res = (sum % 10) + res
      extra = sum > 10
    }
    return res
  }

  //取得發票字軌可用數量
  function checkAssignLogUseCount(
    assignLogType,
    invoice_type,
    ban,
    dept_code,
    classification,
    year_month,
    _voucher_date,
    requireCount
  ) {
    var _ok = false
    var _assignLogSearch = search.create({
      type: _assignLogRecordId,
      columns: [
        search.createColumn({
          name: 'custrecord_gw_assignlog_businessno',
          summary: search.Summary.GROUP,
        }),
        search.createColumn({
          name: 'custrecord_gw_assignlog_startno',
          summary: search.Summary.COUNT,
        }),
        search.createColumn({
          name: 'custrecord_gw_assignlog_usedcount',
          summary: search.Summary.SUM,
        }),
      ],
    })

    var _filterArray = []
    _filterArray.push(['custrecord_gw_assignlog_businessno', 'is', ban])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_egui_format_code',
      search.Operator.IS,
      _invoceFormatCode,
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_assignlog_invoicetype',
      'is',
      invoice_type,
    ])

    if (dept_code === '') {
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_deptcode', 'isempty', ''])
    } else {
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_deptcode', 'is', dept_code])
    }
    if (classification === '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        'isempty',
        '',
      ])
    } else {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        'is',
        classification,
      ])
    }
    _filterArray.push('and')
    _filterArray.push(['custrecord_gw_assignlog_yearmonth', 'is', year_month])

    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_last_invoice_date',
      search.Operator.LESSTHANOREQUALTO,
      parseInt(_voucher_date),
    ])

    _filterArray.push('and')
    //_filterArray.push([['custrecord_gw_assignlog_status','is', '11'],'or',['custrecord_gw_assignlog_status','is', '12']]);
    if (assignLogType !== 'NONE') {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '11'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '12'],
      ])
    } else {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '21'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '22'],
      ])
    }
    //alert('_filterArray='+JSON.stringify(_filterArray));
    _assignLogSearch.filterExpression = _filterArray

    var _totalCount = 0
    var _noCount = 0
    _assignLogSearch.run().each(function (result) {
      var _businessno = result.getValue({
        name: 'custrecord_gw_assignlog_businessno',
        summary: search.Summary.GROUP,
      })
      _noCount += parseInt(
        result.getValue({
          name: 'custrecord_gw_assignlog_startno',
          summary: search.Summary.COUNT,
        })
      )

      var _usedCount = parseInt(
        result.getValue({
          name: 'custrecord_gw_assignlog_usedcount',
          summary: search.Summary.SUM,
        }),
        10
      )

      _totalCount += 50 - parseInt(_usedCount)

      return true
    })
    if (_totalCount >= parseInt(requireCount) && _noCount != 0) _ok = true

    return _ok
  }

  //檢查發票可扣抵金額是否足夠
  /**
   * assignLogType : 是否上傳
   * ban  : 統編
   * dept_code : 部門代碼
   * classification : 類別
   * year_month: 期數
   * period : 期別(本期=>this_period, 前期=>early_period)
   * invoiceType : 發票類別(07, 08)
   * taxType : 稅別
   * disconutTaxType : 折讓稅別 (A0101放 -1 進來)
   * deductionSalesAmount : 扣抵金額(未稅)
   */
  function checkCreditMemoAmount(
    assignLogType,
    buyer_id,
    buyer_identifier,
    ban,
    deptCode,
    classification,
    yearMonth,
    voucher_date,
    period,
    deduction_egui_number,
    invoiceType,
    taxType,
    disconutTaxType,
    deductionSalesAmount
  ) {
    var _ok = false
    try {
      var _search = search.create({
        type: _voucher_main_record,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_seller',
            summary: search.Summary.GROUP,
          }),
          search.createColumn({
            name: 'custrecord_gw_sales_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_free_sales_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_zero_sales_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_discount_sales_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_discount_free_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_discount_zero_amount',
            summary: search.Summary.SUM,
          }),
          search.createColumn({
            name: 'custrecord_gw_discount_amount',
            summary: search.Summary.SUM,
          }),
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_voucher_upload_status',
        search.Operator.IS,
        'C',
      ])

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_type',
        search.Operator.IS,
        'EGUI',
      ])

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_buyer',
        search.Operator.IS,
        buyer_identifier,
      ])
      //20201030 walter modify
      if (buyer_identifier == '0000000000') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_original_buyer_id',
          search.Operator.IS,
          buyer_id,
        ])
      }
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_seller', search.Operator.IS, ban])

      //voucher_date
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.LESSTHANOREQUALTO,
        parseInt(voucher_date),
      ])

      //指定發票不分Invoice_type
      if (stringutility.trim(deduction_egui_number) == '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_invoice_type',
          search.Operator.IS,
          invoiceType,
        ])
      }
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_tax_type', search.Operator.IS, taxType])

      //20201102 walter modify 不擋部門
      /**
         if (deptCode === '') {
			  _filterArray.push('and');
			  _filterArray.push(['custrecord_gw_voucher_dept_code',search.Operator.ISEMPTY, '']);
		  } else {
			  _filterArray.push('and');
			  _filterArray.push(['custrecord_gw_voucher_dept_code',search.Operator.IS, deptCode]);
		  }
         if (classification === '') {
			  _filterArray.push('and');
			  _filterArray.push(['custrecord_gw_voucher_classification',search.Operator.ISEMPTY, '']);
		  } else {
			  _filterArray.push('and');
			  _filterArray.push(['custrecord_gw_voucher_classification',search.Operator.IS, classification]);
		  }
         */
      if (period === 'this_period') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_yearmonth',
          search.Operator.IS,
          yearMonth,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_format_code',
          search.Operator.IS,
          _invoceFormatCode,
        ])
      } else if (period === 'early_period') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_yearmonth',
          search.Operator.LESSTHAN,
          yearMonth,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_format_code',
          search.Operator.IS,
          _invoceFormatCode,
        ])
      } else {
        //指定發票
        _filterArray.push('and')

        var deduction_egui_number_ary = deduction_egui_number.split(',')
        var _filter_ary = []
        for (var i = 0; i < deduction_egui_number_ary.length; i++) {
          var _number = deduction_egui_number_ary[i]

          var _sub_filter_ary = []
          _sub_filter_ary.push('custrecord_gw_voucher_number')
          _sub_filter_ary.push(search.Operator.IS)
          _sub_filter_ary.push(_number)

          if (i == 0) {
            _filter_ary.push(_sub_filter_ary)
          } else {
            _filter_ary.push('or')
            _filter_ary.push(_sub_filter_ary)
          }
        }
        _filterArray.push(_filter_ary)
      }
      _filterArray.push('and')
      _filterArray.push([
        'sum(formulanumeric:{custrecord_gw_sales_amount}+{custrecord_gw_free_sales_amount}+{custrecord_gw_zero_sales_amount}-{custrecord_gw_discount_amount})',
        search.Operator.NOTEQUALTO,
        0,
      ])
      if (disconutTaxType == '1') {
        _filterArray.push('and')
        _filterArray.push([
          'sum(formulanumeric:{custrecord_gw_sales_amount}-{custrecord_gw_discount_sales_amount})',
          search.Operator.NOTEQUALTO,
          0,
        ])
      } else if (disconutTaxType == '2') {
        _filterArray.push('and')
        _filterArray.push([
          'sum(formulanumeric:{custrecord_gw_zero_sales_amount}-{custrecord_gw_discount_zero_amount})',
          search.Operator.NOTEQUALTO,
          0,
        ])
      } else if (disconutTaxType == '3') {
        _filterArray.push('and')
        _filterArray.push([
          'sum(formulanumeric:{custrecord_gw_free_sales_amount}-{custrecord_gw_discount_free_amount})',
          search.Operator.NOTEQUALTO,
          0,
        ])
      }

      //先不檔
      if (assignLogType === 'NONE') {
        //_filterArray.push('and');
        //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.IS, 'NONE']);
      } else {
        //_filterArray.push('and');
        //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.ISNOT, 'NONE']);
      }
      _search.filterExpression = _filterArray
      //alert('_filterArray='+JSON.stringify(_filterArray));
      var _amountSum = 0
      _search.run().each(function (result) {
        var _seller = result.getValue({
          name: 'custrecord_gw_seller',
          summary: search.Summary.GROUP,
        })

        var _sales_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_sales_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _free_sales_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_free_sales_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _zero_sales_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_zero_sales_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _discount_sales_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_discount_sales_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _discount_free_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_discount_free_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _discount_zero_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_discount_zero_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        var _discount_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_discount_amount',
            summary: search.Summary.SUM,
          }),
          10
        )

        if (disconutTaxType == '1') {
          _amountSum += _sales_amount - _discount_sales_amount
        } else if (disconutTaxType == '2') {
          _amountSum += _zero_sales_amount - _discount_zero_amount
        } else if (disconutTaxType == '3') {
          _amountSum += _free_sales_amount - _discount_free_amount
        } else {
          _amountSum +=
            _sales_amount +
            _free_sales_amount +
            _zero_sales_amount -
            _discount_amount
        }

        return true
      })

      //因為 deductionSalesAmount 為負數
      if (_amountSum + deductionSalesAmount >= 0) _ok = true
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _ok
  }

  //檢查發票可扣抵金額
  /**
   * assignLogType : 是否上傳
   * ban  : 統編
   * dept_code : 部門代碼
   * classification : 類別
   * year_month: 期數
   * period : 期別(本期=>this_period, 前期=>early_period)
   * invoiceType : 發票類別(07, 08)
   * taxType : 稅別
   * deductionTotalAmount : 扣抵金額(未稅)
   */
  function geteGUIDeductionItems(
    assignLogType,
    buyer_id,
    buyer_identifier,
    ban,
    deptCode,
    classification,
    yearMonth,
    voucher_date,
    period,
    deduction_egui_number,
    invoiceType,
    taxType,
    checkField,
    deductionTotalAmount
  ) {
    var _ok = false
    var _objAry = []
    var _search = search.create({
      type: _voucher_main_record,
      columns: [
        search.createColumn({
          name: 'custrecord_gw_voucher_date',
          sort: search.Sort.DESC,
        }),
        search.createColumn({ name: 'custrecord_gw_voucher_number' }), //憑證號碼
        search.createColumn({ name: 'custrecord_gw_voucher_yearmonth' }), //憑證期別
        search.createColumn({ name: 'custrecord_gw_sales_amount' }), //未稅金額
        search.createColumn({ name: 'custrecord_gw_free_sales_amount' }), //免稅金額
        search.createColumn({ name: 'custrecord_gw_zero_sales_amount' }), //零稅金額
        search.createColumn({ name: 'custrecord_gw_discount_count' }), //扣抵次數
        search.createColumn({ name: 'custrecord_gw_discount_sales_amount' }),
        search.createColumn({ name: 'custrecord_gw_discount_free_amount' }),
        search.createColumn({ name: 'custrecord_gw_discount_zero_amount' }),
        search.createColumn({ name: 'custrecord_gw_discount_amount' }), //已扣抵未稅金額
      ],
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_voucher_upload_status',
      search.Operator.IS,
      'C',
    ])

    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_type',
      search.Operator.IS,
      'EGUI',
    ])

    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_buyer',
      search.Operator.IS,
      buyer_identifier,
    ])
    //20201030 walter modify
    if (buyer_identifier == '0000000000') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_original_buyer_id',
        search.Operator.IS,
        buyer_id,
      ])
    }
    _filterArray.push('and')
    _filterArray.push(['custrecord_gw_seller', search.Operator.IS, ban])

    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_date',
      search.Operator.LESSTHANOREQUALTO,
      parseInt(voucher_date),
    ])

    //指定發票不分Invoice_type
    if (stringutility.trim(deduction_egui_number) == '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_invoice_type',
        search.Operator.IS,
        invoiceType,
      ])
    }
    //_filterArray.push('and');
    //_filterArray.push(['custrecord_gw_tax_type',search.Operator.IS, taxType]);
    if (checkField == '1') {
      //應稅欄位
      _filterArray.push('and')
      _filterArray.push([
        ['custrecord_gw_tax_type', search.Operator.IS, taxType],
        'or',
        ['custrecord_gw_tax_type', search.Operator.IS, checkField],
      ])
    } else if (checkField == '2') {
      //零稅欄位
      _filterArray.push('and')
      _filterArray.push([
        ['custrecord_gw_tax_type', search.Operator.IS, taxType],
        'or',
        ['custrecord_gw_tax_type', search.Operator.IS, checkField],
      ])
    } else if (checkField == '3') {
      //免稅欄位
      _filterArray.push('and')
      _filterArray.push([
        ['custrecord_gw_tax_type', search.Operator.IS, taxType],
        'or',
        ['custrecord_gw_tax_type', search.Operator.IS, checkField],
      ])
    }

    //20201102 walter modify 不擋部門
    /**
       if (deptCode === '') {
		  _filterArray.push('and');
	      _filterArray.push(['custrecord_gw_voucher_dept_code',search.Operator.ISEMPTY, '']);
	  } else {
		  _filterArray.push('and');
		  _filterArray.push(['custrecord_gw_voucher_dept_code',search.Operator.IS, deptCode]);
	  }
       if (classification === '') {
		  _filterArray.push('and');
	      _filterArray.push(['custrecord_gw_voucher_classification',search.Operator.ISEMPTY, '']);
	  } else {
		  _filterArray.push('and');
		  _filterArray.push(['custrecord_gw_voucher_classification',search.Operator.IS, classification]);
	  }
       */
    if (period === 'this_period') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_yearmonth',
        search.Operator.IS,
        yearMonth,
      ])
    } else if (period === 'early_period') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_yearmonth',
        search.Operator.LESSTHAN,
        yearMonth,
      ])
    } else {
      _filterArray.push('and')

      var deduction_egui_number_ary = deduction_egui_number.split(',')
      var _filter_ary = []
      for (var i = 0; i < deduction_egui_number_ary.length; i++) {
        var _number = deduction_egui_number_ary[i]

        var _sub_filter_ary = []
        _sub_filter_ary.push('custrecord_gw_voucher_number')
        _sub_filter_ary.push(search.Operator.IS)
        _sub_filter_ary.push(_number)

        if (i == 0) {
          _filter_ary.push(_sub_filter_ary)
        } else {
          _filter_ary.push('or')
          _filter_ary.push(_sub_filter_ary)
        }
      }
      _filterArray.push(_filter_ary)
      //_filterArray.push(['custrecord_gw_voucher_number',search.Operator.ANY, deduction_egui_number_ary]);
    }
    //先不檔
    if (assignLogType === 'NONE') {
      //_filterArray.push('and');
      //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.IS, 'NONE']);
    } else {
      //_filterArray.push('and');
      //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.ISNOT, 'NONE']);
    }
    _search.filterExpression = _filterArray

    var _amountSum = 0
    var _count = 0
    var _result = _search.run().getRange({
      start: 0,
      end: 1000,
    })

    for (var i = 0; i < _result.length; i++) {
      var _internalid = _result[i].id
      //發票號碼
      var _voucher_number = _result[i].getValue({
        name: 'custrecord_gw_voucher_number',
      })
      var _voucher_date = _result[i].getValue({
        name: 'custrecord_gw_voucher_date',
      })
      var _voucher_yearmonth = _result[i].getValue({
        name: 'custrecord_gw_voucher_yearmonth',
      })
      var _discount_count = _result[i].getValue({
        name: 'custrecord_gw_discount_count',
      })
      //未稅金額
      var _sales_amount = _result[i].getValue({
        name: 'custrecord_gw_sales_amount',
      })
      //免稅金額
      var _free_sales_amount = _result[i].getValue({
        name: 'custrecord_gw_free_sales_amount',
      })
      //零稅金額
      var _zero_sales_amount = _result[i].getValue({
        name: 'custrecord_gw_zero_sales_amount',
      })
      //已折金額(未稅)
      var _discount_amount = _result[i].getValue({
        name: 'custrecord_gw_discount_amount',
      })

      var _discount_sales_amount = _result[i].getValue({
        name: 'custrecord_gw_discount_sales_amount',
      })
      var _discount_free_amount = _result[i].getValue({
        name: 'custrecord_gw_discount_free_amount',
      })
      var _discount_zero_amount = _result[i].getValue({
        name: 'custrecord_gw_discount_zero_amount',
      })
      ///////////////////////////////////////////////////////////////////////////////////
      //可扣抵餘額
      var _balance_amount = 0
      if (checkField == '1') {
        //應稅欄位
        _balance_amount =
          stringutility.convertToFloat(_sales_amount) -
          stringutility.convertToFloat(_discount_sales_amount)
      } else if (checkField == '2') {
        //零稅欄位
        _balance_amount =
          stringutility.convertToFloat(_zero_sales_amount) -
          stringutility.convertToFloat(_discount_zero_amount)
      } else if (checkField == '3') {
        //免稅欄位
        _balance_amount =
          stringutility.convertToFloat(_free_sales_amount) -
          stringutility.convertToFloat(_discount_free_amount)
      }

      _amountSum += _balance_amount

      if (deductionTotalAmount >= _balance_amount) {
        var _obj = {
          internalid: _internalid,
          voucher_number: _voucher_number,
          voucher_date: _voucher_date,
          voucher_yearmonth: _voucher_yearmonth,
          voucher_sales_amount: stringutility.convertToFloat(_sales_amount),
          voucher_free_amount: stringutility.convertToFloat(_free_sales_amount),
          voucher_zero_amount: stringutility.convertToFloat(_zero_sales_amount),
          discount_count: stringutility.convertToFloat(_discount_count) + 1, //折讓次數累計
          deduction_amount: _balance_amount, //本次折讓金額
          deduction_field: checkField, //扣抵欄位
          discount_sales_amount: 0, //扣抵應稅欄位
          discount_zero_amount: 0, //扣抵零稅欄位
          discount_free_amount: 0, //扣抵免稅欄位
          discount_amount: 0, //折讓金額累計
        }

        if (checkField == '1') {
          //應稅欄位
          _obj.discount_sales_amount = stringutility.convertToFloat(
            _sales_amount
          )
          _obj.discount_amount = stringutility.convertToFloat(_sales_amount)
        } else if (checkField == '2') {
          //零稅欄位
          _obj.discount_zero_amount = stringutility.convertToFloat(
            _zero_sales_amount
          )
          _obj.discount_amount = stringutility.convertToFloat(
            _zero_sales_amount
          )
        } else if (checkField == '3') {
          //免稅欄位
          _obj.discount_free_amount = stringutility.convertToFloat(
            _free_sales_amount
          )
          _obj.discount_amount = stringutility.convertToFloat(
            _free_sales_amount
          )
        }
        //扣掉金額
        deductionTotalAmount -= _balance_amount
        _objAry.push(_obj)
      } else if (deductionTotalAmount != 0) {
        _discount_count = stringutility.convertToFloat(_discount_count) + 1
        //_discount_amount = deductionTotalAmount+stringutility.convertToFloat(_discount_amount);

        var _obj = {
          internalid: _internalid,
          voucher_number: _voucher_number,
          voucher_date: _voucher_date,
          voucher_yearmonth: _voucher_yearmonth,
          voucher_sales_amount: stringutility.convertToFloat(_sales_amount),
          voucher_free_amount: stringutility.convertToFloat(_free_sales_amount),
          voucher_zero_amount: stringutility.convertToFloat(_zero_sales_amount),
          discount_count: _discount_count,
          deduction_amount: deductionTotalAmount,
          deduction_field: checkField, //扣抵欄位
          discount_sales_amount: 0, //扣抵應稅欄位
          discount_zero_amount: 0, //扣抵零稅欄位
          discount_free_amount: 0, //扣抵免稅欄位
          discount_amount: 0,
        }
        if (checkField == '1') {
          //應稅欄位
          _obj.discount_sales_amount =
            stringutility.convertToFloat(deductionTotalAmount) +
            stringutility.convertToFloat(_discount_sales_amount)
          _obj.discount_amount =
            deductionTotalAmount +
            stringutility.convertToFloat(deductionTotalAmount)
        } else if (checkField == '2') {
          //零稅欄位
          _obj.discount_zero_amount =
            stringutility.convertToFloat(deductionTotalAmount) +
            stringutility.convertToFloat(_discount_zero_amount)
          _obj.discount_amount =
            deductionTotalAmount +
            stringutility.convertToFloat(deductionTotalAmount)
        } else if (checkField == '3') {
          //免稅欄位
          _obj.discount_free_amount =
            stringutility.convertToFloat(deductionTotalAmount) +
            stringutility.convertToFloat(_discount_free_amount)
          _obj.discount_amount =
            deductionTotalAmount +
            stringutility.convertToFloat(deductionTotalAmount)
        }

        _objAry.push(_obj)
        break
      }
    }
    if (_amountSum >= deductionTotalAmount) _ok = true

    var _checkObj = {
      checkResult: _ok,
      eGUIResult: _objAry,
    }
    //alert('_checkObj='+JSON.stringify(_checkObj));
    return _checkObj
  }

  //取得折扣商品名稱及單價(傳入discountitem)
  function getDiscountItemInformation(itemId) {
    var _itemName = ''
    var _itemUnitPrice = '0'
    var _search = search
      .create({
        type: search.Type.DISCOUNT_ITEM,
        columns: [
          'internalid',
          'itemid',
          'price',
          'onlineprice',
          'description',
          'displayname',
        ],
        filters: ['internalid', 'is', parseInt(itemId)],
      })
      .run()
      .each(function (result) {
        _itemName = result.getValue({
          name: 'displayname',
        })
        _itemUnitPrice = result.getValue({
          //折扣
          name: 'price',
        })
        return true
      })
    var _jsonObj = { itemName: _itemName, itemUnitPrice: _itemUnitPrice }

    return _jsonObj
  }

  /**
   * type : 類別 (INVOICE, CREDITMEMO)
   * internalId : internalId
   * discountHistoryAry : 折扣紀錄
   */
  function getDiscountItemAmountObj(type, internalId, discountHistoryAry) {
    var _discountitem = ''
    var _discounttotal = 0

    if (type === 'INVOICE') {
      //載入Invoice基本資料
      var _record = record.load({
        type: search.Type.INVOICE,
        id: parseInt(internalId),
        isDynamic: true,
      })
      _discountitem = _record.getValue({
        fieldId: 'discountitem',
      })
      if (typeof _discountitem !== 'undefined') {
        _discounttotal = _record.getValue({
          fieldId: 'discounttotal',
        })
      }
    } else {
      //CREDITMEMO
      var _record = record.load({
        type: search.Type.CREDIT_MEMO,
        id: parseInt(internalId),
        isDynamic: true,
      })
      _discountitem = _record.getValue({
        fieldId: 'discountitem',
      })
      if (typeof _discountitem !== 'undefined') {
        _discounttotal = _record.getValue({
          fieldId: 'discounttotal',
        })
      }
    }

    if (typeof _discountitem !== 'undefined' && _discountitem !== '') {
      var _discounttotal = _record.getValue({
        fieldId: 'discounttotal',
      })

      var _exist = false
      if (discountHistoryAry.length != 0) {
        for (var i = 0; i < discountHistoryAry.length; i++) {
          var _obj = discountHistoryAry[i]
          if (_discountitem === _obj.discountitem) {
            _obj.discounttotal =
              stringutility.convertToFloat(_obj.discounttotal) +
              stringutility.convertToFloat(_discounttotal)
            _exist = true
            break
          }
        }
      }
      if (_exist === false) {
        var _discountObj = getDiscountItemInformation(_discountitem)
        var _discountJsonObj = {
          discountitem: _discountitem,
          discountitemname: _discountObj.itemName,
          discounttotal: _discounttotal,
        }
        discountHistoryAry.push(_discountJsonObj)
      }
    }

    return discountHistoryAry
  }

  //將異動結果回寫到Invoice.custbody_gw_voucher_flow_status = '1'
  function updateCashSaleFlowStatus(guiNumberAry) {
    var _cash_sale_hiddent_listid = _current_record.getValue({
      fieldId: 'custpage_cash_sale_hiddent_listid',
    })

    var _invoce_control_field_value = gwconfigure.lockInvoceControlFieldId()
    if (typeof _cash_sale_hiddent_listid !== 'undefined') {
      var _idAry = _cash_sale_hiddent_listid.split(',')
      for (var i = 0; i < _idAry.length; i++) {
        var _internalId = _idAry[i]
        if (parseInt(_internalId) > 0) {
          try {
            var values = {}
            values[_invoce_control_field_id] = _invoce_control_field_value

            if (
              typeof guiNumberAry !== 'undefined' &&
              guiNumberAry.length != 0
            ) {
              var _egui_start_no = guiNumberAry[0]
              var _egui_end_no = guiNumberAry[guiNumberAry.length - 1]
              values[_gw_gui_num_start_field] = _egui_start_no
              values[_gw_gui_num_end_field] = _egui_end_no
            }

            var _id = record.submitFields({
              type: record.Type.CASH_SALE,
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
    }
    //////////////////////////////////////////////////////////////////////////////////////////////
  }

  //回前一頁
  function backToPage() {
    try {
      history.go(-1)
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  return {
    pageInit: constructorWrapper(pageInit),
    backToPage: constructorWrapper(backToPage),
    submitDocument: constructorWrapper(submitDocument),
    fieldChanged: constructorWrapper(fieldChanged),
    sublistChanged: constructorWrapper(sublistChanged),
  }
})
