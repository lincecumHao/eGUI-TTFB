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

  var _assignLogActionScriptId = gwconfigure.getGwAssignLogActionScriptId()
  var _assignLogActionDeploymentId = gwconfigure.getGwAssignLogActionDeploymentId()
  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()

  //Record List
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()
  var _deposit_voucher_record = gwconfigure.getGwDepositVoucherRecord()

  //稅別代碼
  var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數

  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()

  //Page Parameters
  var _invoice_hiddent_listid = 'custpage_invoice_hiddent_listid'
  var _creditmemo_hiddent_listid = 'custpage_creditmemo_hiddent_listid'

  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  var _defaultAssignLogType = 'TYPE_1'

  var _default_upload_status = 'A' //A->P->C,E

  var _cutomerDepositSublistId = 'customerdepositsublistid'

  var _gw_gui_num_start_field = 'custbody_gw_gui_num_start'
  var _gw_gui_num_end_field = 'custbody_gw_gui_num_end'

  //稅差
  var _tax_diff_balance = ''

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
    } else if (_changeFieldId == 'custpage_allowance_deduction_period') {
      var _allowance_deduction_period = _current_record.getValue({
        fieldId: _changeFieldId,
      })
      var _deduction_egui_number = _current_record.getField({
        fieldId: 'custpage_deduction_egui_number',
      })
      if (_allowance_deduction_period === 'user_selected') {
        _deduction_egui_number.isDisplay = true //顯示
      } else {
        _deduction_egui_number.isDisplay = false //不顯示
        _current_record.setValue({
          fieldId: 'custpage_deduction_egui_number',
          value: '',
          ignoreFieldChange: true,
        })
      }
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

  //欄位檢查
  function validateForm() {
    var _errorMsg = ''

    try {
      var _deposit_hiddent_id = _current_record.getValue({ fieldId: 'custpage_customer_deposit_hiddent_listid' })
	  var _record = record.load({
	    type: record.Type.CUSTOMER_DEPOSIT,
	    id: _deposit_hiddent_id,
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
      //3.載具格式錯誤, 請輸入載具類別, 輸入統編不得使用自然人(CQ0001)載具!
      var _custpage_customer_id = _current_record.getValue({
        fieldId: 'custpage_customer_id',
      })
      var _carrier_type = _current_record.getValue({
        fieldId: 'custpage_carrier_type',
      })
      if (_custpage_customer_id != '00000000' && _carrier_type === 'CQ0001') {
        _errorMsg += '輸入統編不得使用自然人(CQ0001)載具,'
      }
      //4.載具號碼錯誤! 手機條碼 自然人載具錯誤!
      var _carrier_id = _current_record.getValue({
        fieldId: 'custpage_carrier_id',
      })
      if (_carrier_type === 'CQ0001') {
        //自然人憑證
        if (!validate.checkCarrier(_carrier_type, _carrier_id)) {
          _errorMsg += '請輸入正確自然人憑證格式,'
        }
      } else if (_carrier_type === '3J0002') {
        //手機條碼
        if (!validate.checkCarrier(_carrier_type, _carrier_id)) {
          _errorMsg += '請輸入正確手機條碼格式,'
        }
      }
      //5.Email格式錯誤!
      var _buyer_email = _current_record.getValue({
        fieldId: 'custpage_buyer_email',
      })
      if (_buyer_email.length != 0) {
        if (!validate.checkEmail(_buyer_email)) {
          _errorMsg += '請輸入正確Email格式,'
        }
      }
      //custpage_buyer_identifier
      var _buyer_identifier = _current_record.getValue({
        fieldId: 'custpage_buyer_identifier',
      })
      //檢查統編
      if (!validate.isValidGUI(_buyer_identifier) && _buyer_identifier !='0000000000') {
          _errorMsg += '統編格式錯誤<br>'
      } 
      
      var _buyer_name = _current_record.getValue({
        fieldId: 'custpage_buyer_name',
      })
      if (_buyer_name.length == 0) {
        _errorMsg += '買方公司名稱不可空白,'
      }

      //5.捐贈碼Npoban: '請輸入3-7碼數字'-Done
      var _npo_ban = _current_record.getValue({ fieldId: 'custpage_npo_ban' })
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
      var _manual_voucher_number = _current_record.getValue({
        fieldId: 'custpage_manual_voucher_number',
      })
      //31-01
      var _egui_format_code_str = _current_record.getValue({
        fieldId: 'custpage_egui_format_code',
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

      //檢查明細(名稱:256+明細備註:40)
      _errorMsg += checkDetailItems(_manual_voucher_number)
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _errorMsg
  }

  //檢查明細(名稱:256+明細備註:40)
  function checkDetailItems(_manual_voucher_number) {
    var _errorMsg = ''
    //Involic SubList
    var _invoice_item_count = _current_record.getLineCount({
      sublistId: _cutomerDepositSublistId,
    })
    if (typeof _invoice_item_count !== 'undefined') {
      for (var i = 0; i < _invoice_item_count; i++) {
        var _item_name = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_item_name',
          line: i,
        })

        var _item_remark = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
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

    return _errorMsg
  }

  function pageInit() {
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
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //開立發票區塊-START
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //處理憑證資料
  function submitDocument(assignlogScriptId, assignlogDeploymentId) {
    try {
      var options = {
        title: '憑證管理',
        message: '是否開立發票',
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
    //發票處理-START
    //上傳方式
    var _assignLogType = _current_record.getValue({
      fieldId: 'custpage_allowance_log_type',
    })
    //開立方式==>MERGE-INVOICE, MERGE-CREDITMEMO, MERGE-ALL(INVOICE+CREDITMEMO), SINGLE(各別開)
    var _voucherOpenType = _current_record.getValue({
      fieldId: 'custpage_voucher_open_type',
    })
     
    var _customer_deposit_selected_listid = _current_record.getValue({
      fieldId: 'custpage_customer_deposit_hiddent_listid',
    })

    //發票日期=>處理年月
    var _select_voucher_date = _current_record.getValue({
      fieldId: 'custpage_select_voucher_date',
    })
    var _formattedDate = format.format({
      value: _select_voucher_date,
      type: format.Type.DATETIME,
      timezone: format.Timezone.ASIA_TAIPEI,
    })
    var _year_month = dateutility.getTaxYearMonthByDateObj(_select_voucher_date) //10910
    var _voucher_date = dateutility.getConvertDateByDateObj(
      _select_voucher_date
    ) //20201005

    //20201201 walter modify
    var _manual_voucher_number = _current_record.getValue({
      fieldId: 'custpage_manual_voucher_number',
    })

    //依照金額判斷開立方式==>整理資料每999筆1包
    var _mig_type = _current_record.getValue({ fieldId: 'custpage_mig_type' }) //B2BS, B2BE, B2C
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //取得頁面Main填寫資料(GUI或Allowance)
    var _applyMainObj = getApplyMainObject(_year_month)
    //alert('_applyMainObj='+JSON.stringify(_applyMainObj));

    //1.依稅(TaxCode)分流稅別資料(INVOICE+CREDITMEMO)混在一起
    var _jsonDocumemtLists = splitDocumentDetail(_applyMainObj)
    //alert('_jsonDocumemtLists='+JSON.stringify(_jsonDocumemtLists));
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var _eDocument_TaxType_1_Ary = _jsonDocumemtLists.eDocument_TaxType_1_Ary //1=應稅 [5]
    //alert('_eDocument_TaxType_1_Ary='+JSON.stringify(_eDocument_TaxType_1_Ary));
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //檢查字軌張數
    var _requireCount = '1'
    var _checkInvoiceCountFlag = false
    if (stringutility.trim(_manual_voucher_number) != '') {
      _checkInvoiceCountFlag = true
    } else {
      _checkInvoiceCountFlag = checkAssignLogUseCount(
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
    //alert('_checkInvoiceCountFlag='+_checkInvoiceCountFlag);
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //處理資料-START
    if (_checkInvoiceCountFlag == false) {
      var _title = '憑證管理'
      var _message = '字軌可開立張數不足或開立日期小於字軌日期,請重新確認!'

      gwmessage.showErrorMessage(_title, _message)
    } else {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //處理要開發票的部分(999筆1包)-START
      var _applyId = saveVoucherApplyListRecord(
        _voucherOpenType,
        _assignLogType,
        _applyMainObj,
        _customer_deposit_selected_listid,
        _user_id
      )

      var _egui_number = ''
      var _forward_voucher_main_id = -1
      
      if (_eDocument_TaxType_1_Ary.length != 0) {    	   
        var _egui_obj = createEGUIDocument( 
          _voucherOpenType,
          _assignLogType,
          _year_month,
          _applyId,
          _applyMainObj,
          _eDocument_TaxType_1_Ary,
          _voucher_date,
          _user_id
        )
        
        _forward_voucher_main_id = _egui_obj.mainRecordId
        _egui_number = _egui_obj.invoiceNumber
      }
      //處理要開發票的部分(999筆1包)-END

      /////////////////////////////////////////////////////////////////////////////////////////////////////////
      var _title = '憑證管理'
      var _message = '開立完成!'
      log.debug(_title, _message)
      if (_egui_number.length != 0) {
        //更新流程紀錄 flow_status='1'
        updateCustomerDepositFlowStatus(
          _customer_deposit_selected_listid,
          _egui_number
        )
        //做完更新資料-END
        gwmessage.showInformationMessage(_title, _message)
        
        ///////////////////////////////////////////////////////////////////
        //forward to egui View
        var _params = {
           voucher_type: 'EGUI',
           voucher_internal_id: _forward_voucher_main_id
        }
  
        window.location = url.resolveScript({
           scriptId: 'customscript_gw_egui_ui_view',
           deploymentId: 'customdeploy_gw_egui_ui_view',
           params: _params,
           returnExternalUrl: false
        })
      ///////////////////////////////////////////////////////////////////
        
      }
      /////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    document.getElementById('custpage_forward_back_button').disabled = false
  }

  function updateVoucherApplyListRecord(applyID, guiCount, allowanceCount) {
    var _voucherApplyListRecord = record.load({
      type: _voucher_apply_list_record,
      id: parseInt(applyID),
      isDynamic: true,
    })

    _voucherApplyListRecord.setValue({
      fieldId: 'custrecord_gw_gui_created_count',
      value: guiCount,
    })
    _voucherApplyListRecord.setValue({
      fieldId: 'custrecord_gw_allowance_created_count',
      value: allowanceCount,
    })

    try {
      _voucherApplyListRecord.save()
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function saveDepositVoucherRecord(
    voucher_main_id,
    voucher_number,
    amount,
    tax_type,
    tax_amount,
    customer_deposit_id,
    sales_order_id,
    sales_order_number,
    deposit_voucher_status
  ) {
    var _record = record.create({
      type: _deposit_voucher_record,
      isDynamic: true,
    })

    _record.setValue({ fieldId: 'name', value: 'VoucherApply' })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_voucher_status',
      value: deposit_voucher_status,
    }) //
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_voucher_main_id',
      value: voucher_main_id,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_egui_number',
      value: voucher_number,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_egui_tax_type',
      value: tax_type,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_egui_tax_amount',
      value: tax_amount,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_egui_amount',
      value: amount,
    })
    var _total_amount = amount + tax_amount
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_egui_total_amount',
      value: _total_amount,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_source_document_type',
      value: 'CUSTOMER_DEPOSIT',
    })
    _record.setValue({
      fieldId: 'custrecord_gw_source_document_id',
      value: customer_deposit_id,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_assign_document_type',
      value: 'SALES_ORDER',
    })
    _record.setValue({
      fieldId: 'custrecord_gw_assign_document_id',
      value: sales_order_id,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_assign_document_number',
      value: sales_order_number,
    })
    _record.setValue({
      fieldId: 'custrecord_gw_deposit_dedcuted_amount',
      value: 0,
    })

    try {
      _record.save()
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
    var _buyer_email = _current_record.getValue({
      fieldId: 'custpage_buyer_email',
    })
    var _buyer_address = _current_record.getValue({
      fieldId: 'custpage_buyer_address',
    })
    var _carrier_type = _current_record.getValue({
      fieldId: 'custpage_carrier_type',
    })
    var _carrier_id_1 = _current_record.getValue({
      fieldId: 'custpage_carrier_id_1',
    })
    var _carrier_id_2 = _current_record.getValue({
      fieldId: 'custpage_carrier_id_2',
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
    var _gui_yearmonth_type = ''
    var _voucher_extra_memo = _current_record.getValue({
      fieldId: 'custpage_voucher_extra_memo',
    })
    var _manual_voucher_number = _current_record.getValue({
      fieldId: 'custpage_manual_voucher_number',
    })

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
      extraMemo: _voucher_extra_memo,
      year_month: year_month,
      tax_type: _tax_type,
      tax_rate: _tax_rate,
      discountamount: _discountamount,
      tax_amount: _tax_amount,
      sales_amount: _sales_amount,
      free_sales_amount: 0,
      zero_sales_amount: 0,
      total_amount: _total_amount,
      egui_format_code: _invoceFormatCode,
      manual_voucher_number: _manual_voucher_number,
      voucher_open_type: 'SINGLE', //先設 default value
    }

    return _applyMainObj
  }

  function saveVoucherApplyListRecord(
    openType,
    assignLogType,
    applyMainObj,
    customerdeposit_hiddent_listid,
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
    _voucherApplyRecord.setValue({
      fieldId: 'custrecord_gw_gui_yearmonth_type',
      value: applyMainObj.gui_yearmonth_type,
    })
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
      fieldId: 'custrecord_gw_customerdeposit_apply_list',
      value: customerdeposit_hiddent_listid,
    })

    if (
      assignLogType === _defaultAssignLogType &&
      stringutility.trim(applyMainObj.manual_voucher_number) == ''
    ) {
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
    mainObj,
    documentAry,
    voucher_date,
    user_id
  ) {
    var _invoiceNumber = ''
    //取得發票號碼 TODO
    var _mainRecordId = 0
    var _voucher_type = 'EGUI'

    var _row = 0
    var _groupID = 0
    var _status = 'VOUCHER_SUCCESS' //2:開立成功, 3:作廢成功

    var _documentDate = voucher_date
    var _documentTime = dateutility.getCompanyLocatTimeForClient()

    var _applyPeriod = invoiceutility.getApplyPeriodOptionId(year_month)

    ////////////////////////////////////////////////////////////////////////////////////////////////////////
    //20201113 walter modify 檢查稅差
    var _tax_diff_error = false
    var _ns_sales_amount = stringutility.convertToFloat(mainObj.sales_amount)
    //_ns_tax_rate=0.05
    var _ns_tax_rate = stringutility.convertToFloat(mainObj.tax_rate) / 100
    var _ns_tax_amount = stringutility.convertToFloat(mainObj.tax_amount)
    if (_tax_diff_balance < 999) {
      _tax_diff_error = invoiceutility.checkTaxDifference(
        _ns_sales_amount,
        _ns_tax_rate,
        _ns_tax_amount,
        _tax_diff_balance
      )
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //20201113 walter modify
    if (_tax_diff_error == true) {
      var _title = '發票管理'
      var _message = '稅差超過(' + _tax_diff_balance + ')元 ,請重新調整!'

      gwmessage.showErrorMessage(_title, _message)
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (typeof documentAry !== 'undefined' && _tax_diff_error == false) {
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //取得發票號碼 TODO
      //統編[24549210]+部門代碼[2]+期數[10908]
      //20201201 walter modify
      if (stringutility.trim(mainObj.manual_voucher_number) != '') {
        _invoiceNumber = mainObj.manual_voucher_number
      } else {
    	/**  
        _invoiceNumber = invoiceutility.getAssignLogNumber(
          mainObj.invoice_type,
          mainObj.company_ban,
          mainObj.dept_code,
          mainObj.classification,
          year_month,
          assignLogType,
          _documentDate
        )
        */
        _invoiceNumber = invoiceutility.getAssignLogNumberAndCheckDuplicate(
				            -1,
				            mainObj.invoice_type,
				            mainObj.company_ban,
				            mainObj.dept_code,
				            mainObj.classification,
				            year_month,
				            assignLogType,
				            _documentDate
				          )
      }
      if (_invoiceNumber.length == 0 || _invoiceNumber == 'BUSY') {
        var _title = '字軌管理'
        var _message = '無本期(' + year_month + ')字軌請匯入或日期小於字軌日期!'
        if (_invoiceNumber == 'BUSY'){
      	    _title   = '憑證管理'
      	    _message ='本期(' + year_month + ')字軌使用忙碌,請稍後再開立!'
        }
        gwmessage.showErrorMessage(_title, _message)
      } else {
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
          value: mainObj.company_ban,
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_seller_name',
          value: mainObj.company_name,
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_seller_address',
          value: stringutility.trim(mainObj.company_address),
        })

        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_buyer',
          value: mainObj.buyer_identifier,
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_buyer_name',
          value: mainObj.buyer_name,
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_buyer_address',
          value: stringutility.trim(mainObj.buyer_address),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_buyer_email',
          value: stringutility.trim(mainObj.buyer_email),
        })
        //_voucherMainRecord.setValue({fieldId:'custrecord_gw_buyer_dept_code',value:mainObj.dept_code});	//暫時不用
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_dept_code',
          value: stringutility.trim(mainObj.dept_code),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_dept_name',
          value: stringutility.trim(mainObj.dept_code),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_classification',
          value: stringutility.trim(mainObj.classification),
        })

        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_invoice_type',
          value: stringutility.trim(mainObj.invoice_type),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_mig_type',
          value: stringutility.trim(mainObj.mig_type),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_format_code',
          value: stringutility.trim(mainObj.egui_format_code),
        })

        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_carrier_type',
          value: stringutility.trim(mainObj.carrier_type),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_carrierid1',
          value: stringutility.trim(mainObj.carrier_id_1),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_carrierid2',
          value: stringutility.trim(mainObj.carrier_id_2),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_npoban',
          value: stringutility.trim(mainObj.npo_ban),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_clearance_mark',
          value: stringutility.trim(mainObj.customs_clearance_mark),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_main_remark',
          value: stringutility.trim(mainObj.main_remark),
        })
 
        var _print_mark = invoiceutility.getPrintMark(
			        		mainObj.npo_ban,
			        		mainObj.carrier_type,
			        		mainObj.buyer_identifier
			              )
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_print_mark',
          value: _print_mark,
        })
        
        var _random_number = invoiceutility.getRandomNumNew(_invoiceNumber, mainObj.company_ban)
        _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_random_number',
            value: _random_number,
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
          value: stringutility
            .convertToFloat(mainObj.sales_amount)
            .toFixed(_numericToFixed),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_free_sales_amount',
          value: stringutility
            .convertToFloat(mainObj.free_sales_amount)
            .toFixed(_numericToFixed),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_zero_sales_amount',
          value: stringutility
            .convertToFloat(mainObj.zero_sales_amount)
            .toFixed(_numericToFixed),
        })

        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_tax_amount',
          value: stringutility
            .convertToFloat(mainObj.tax_amount)
            .toFixed(_numericToFixed),
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_tax_type',
          value: mainObj.tax_type,
        })
        var _main_tax_rate =
          stringutility.convertToFloat(mainObj.tax_rate) / 100
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_tax_rate',
          value: _main_tax_rate,
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_total_amount',
          value: stringutility
            .convertToFloat(mainObj.total_amount)
            .toFixed(_numericToFixed),
        })
        //_voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_extra_memo',value:mainObj.extraMemo});
        _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_original_buyer_id',
            value: mainObj.customer_id,
        })
        //20201201 walter modify
        if (stringutility.trim(mainObj.manual_voucher_number) != '') {
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_need_upload_egui_mig',
            value: 'NONE',
          })
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_is_manual_voucher',
            value: true,
          })
        } else {
          _voucherMainRecord.setValue({
            fieldId: 'custrecord_gw_need_upload_egui_mig',
            value: 'EGUI',
          })
        }
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_main_apply_user_id',
          value: user_id,
        })
        try {
          _mainRecordId = _voucherMainRecord.save() 
        } catch (e) {
          console.log(e.name + ':' + e.message)
        }

        if (typeof documentAry !== 'undefined') {
          for (var i = 0; i < documentAry.length; i++) {
            var _obj = documentAry[i]
            //////////////////////////////////////////////////////////////////////////////////////////////////
            //紀錄發票對應關係(Customer Deposit及Sales Order)
            if (i == 0) {
              try {
                var _deposit_voucher_status = 'A'
                if (stringutility.trim(mainObj.manual_voucher_number) != '') {
                  _deposit_voucher_status = 'C'
                }
                var _deposit_amount =
                  stringutility.convertToFloat(mainObj.sales_amount) +
                  stringutility.convertToFloat(mainObj.free_sales_amount) +
                  stringutility.convertToFloat(mainObj.zero_sales_amount)

                saveDepositVoucherRecord(
                  _mainRecordId,
                  _invoiceNumber,
                  _deposit_amount,
                  mainObj.tax_type,
                  stringutility.convertToFloat(mainObj.tax_amount),
                  stringutility.convertToInt(_obj.customerdeposit_id),
                  stringutility.convertToInt(_obj.sales_order_id),
                  _obj.sales_order_number,
                  _deposit_voucher_status
                )
              } catch (e) {
                console.log(e.name + ':' + e.message)
              }
            }
            //////////////////////////////////////////////////////////////////////////////////////////////////

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
              value: stringutility
                .convertToFloat(_obj.item_amount)
                .toFixed(_numericToFixed)
                .toString(),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_tax_amount',
              value: stringutility
                .convertToFloat(_obj.item_tax_amount)
                .toFixed(_numericToFixed)
                .toString(),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_total_amount',
              value: stringutility
                .convertToFloat(_obj.item_total_amount)
                .toFixed(_numericToFixed)
                .toString(),
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
              value: _obj.customerdeposit_id,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_number',
              value: _obj.customerdeposit_number,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_item_id',
              value: _obj.customerdeposit_seq,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_items_seq',
              value: _obj.customerdeposit_seq,
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
    
    return {'mainRecordId':_mainRecordId, 'invoiceNumber':_invoiceNumber}
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

  //取得折讓單扣抵發票資料
  function getDeductionInvoiceInformation(
    deductionTaxType,
    deductionAmount,
    eGUIDetails
  ) {
    var _invoiceObjAry = []
    if (typeof eGUIDetails !== 'undefined') {
      for (var i = 0; i < eGUIDetails.length; i++) {
        var _obj = eGUIDetails[i]

        var _amount = 0
        if (deductionTaxType == '1') {
          _amount = Math.abs(_obj.voucher_sales_amount)
        } else if (deductionTaxType == '2') {
          _amount = Math.abs(_obj.voucher_zero_amount)
        } else if (deductionTaxType == '3') {
          _amount = Math.abs(_obj.voucher_free_amount)
        }
        if (deductionAmount >= stringutility.convertToFloat(_amount)) {
          if (deductionTaxType == '1') {
            _obj.voucher_sales_amount = '0'
          } else if (deductionTaxType == '2') {
            _obj.voucher_zero_amount = '0'
          } else if (deductionTaxType == '3') {
            _obj.voucher_free_amount = '0'
          }

          deductionAmount =
            deductionAmount - stringutility.convertToFloat(_amount)
        } else {
          if (deductionTaxType == '1') {
            _obj.voucher_sales_amount =
              stringutility.convertToFloat(_amount) - deductionAmount
          } else if (deductionTaxType == '2') {
            _obj.voucher_zero_amount =
              stringutility.convertToFloat(_amount) - deductionAmount
          } else if (deductionTaxType == '3') {
            _obj.voucher_free_amount =
              stringutility.convertToFloat(_amount) - deductionAmount
          }

          deductionAmount = 0
        }
        _invoiceObjAry.push(_obj)

        if (deductionAmount == 0) break
      }
    }
    return _invoiceObjAry
  }

  //將資料依稅別分流
  function splitDocumentDetail(applyMainObj) {
    //判斷處理方式
    //accessType=INVOICE[只處理Invoice]
    //accessType=CREDITMEMO[只處理CreditMemo]
    //accessType=ALL[Invoice+CreditMemo]
    var _accessType = 'INVOICE'

    var _amount_TaxType_1 = 0 //1=應稅   [1]
    var _eDocument_TaxType_1_Ary = [] //1=應稅 [5], 特種稅率 [1, 2, 5, 15, 25]

    var _sales_order_id = _current_record.getValue({
      fieldId: 'custpage_customer_salesorder_hiddent_listid',
    })
    var _sales_order_number = _current_record.getValue({
      fieldId: 'custpage_customer_salesordernumber_hiddent_listid',
    })

    var _deptcode = _current_record.getValue({ fieldId: 'custpage_dept_code' })
    var _class = _current_record.getValue({
      fieldId: 'custpage_classification',
    })
    var _invoice_type = _current_record.getValue({
      fieldId: 'custpage_invoice_type',
    }) //07, 08
    var _buyer_identifier = _current_record.getValue({
      fieldId: 'custpage_buyer_identifier',
    }) //買方統編
    var _invoice_item_count = _current_record.getLineCount({
      sublistId: _cutomerDepositSublistId,
    })

    if (typeof _invoice_item_count !== 'undefined') {
      for (var i = 0; i < _invoice_item_count; i++) {
        var _customerdeposit_id = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'customer_search_customerdeposit_id',
          line: i,
        })
        var _customerdeposit_number = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'customer_search_customerdeposit_number',
          line: i,
        })

        var _customerdeposit_seq = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'customer_search_customerdeposit_seq',
          line: i,
        })
        var _tax_code = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'customer_search_customerdeposit_tax_code',
          line: i,
        })
        var _tax_rate = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'customer_search_customerdeposit_tax_rate',
          line: i,
        })
        var _item_name = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_item_name',
          line: i,
        })
        var _unit_price = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_unit_price',
          line: i,
        })
        var _item_quantity = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_item_quantity',
          line: i,
        })
        var _item_unit = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_customerdeposit_item_unit',
          line: i,
        })
        var _item_amount = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_item_amount',
          line: i,
        })
        var _item_remark = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_item_remark',
          line: i,
        })

        var _item_tax_amount = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_invoice_item_tax_amount',
          line: i,
        })
        var _item_total_amount = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_invoice_item_total_amount',
          line: i,
        })
        var _total_tax_amount = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_invoice_total_tax_amount',
          line: i,
        })
        var _total_sum_amount = _current_record.getSublistValue({
          sublistId: _cutomerDepositSublistId,
          fieldId: 'custpage_invoice_total_sum_amount',
          line: i,
        })

        //目前taxCode=10 [應稅] , taxCode=5 [免稅] ,
        //1=應稅 [1, 2, 5, 15, 25]
        //2=零稅率 [0]
        //3=免稅   [0]
        var _obj = {
          customerdeposit_id: stringutility.trim(_customerdeposit_id),
          customerdeposit_number: stringutility.trim(_customerdeposit_number),
          customerdeposit_seq: _customerdeposit_seq,
          sales_order_id: _sales_order_id,
          sales_order_number: _sales_order_number,
          tax_type: '1',
          deptcode: stringutility.trim(_deptcode),
          classification: stringutility.trim(_class),
          tax_code: _tax_code,
          tax_rate: _tax_rate,
          item_name: _item_name,
          unit_price: _unit_price,
          item_quantity: _item_quantity,
          item_unit: _item_unit,
          item_amount: _item_amount,
          item_tax_amount: _item_tax_amount,
          item_total_amount: _item_total_amount,
          total_tax_amount: _total_tax_amount,
          total_sum_amount: _total_sum_amount,
          document_type: 'CUSTOMER_DEPOSIT',
          item_remark: _item_remark,
        }

        _eDocument_TaxType_1_Ary.push(_obj)
        _amount_TaxType_1 += stringutility.convertToFloat(_item_amount)
      }
    }

    var _jsonDocumemtLists = {
      accessType: _accessType,
      amount_TaxType_1: _amount_TaxType_1,
      eDocument_TaxType_1_Ary: _eDocument_TaxType_1_Ary, //1=應稅 [5]
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
    invoice_type,
    ban,
    dept_code,
    classification,
    year_month,
    voucher_date,
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
    _filterArray.push([
      'custrecord_gw_last_invoice_date',
      search.Operator.LESSTHANOREQUALTO,
      parseInt(voucher_date),
    ])
    //_filterArray.push([['custrecord_gw_last_invoice_date',search.Operator.LESSTHANOREQUALTO, parseInt(voucher_date)],'or',['custrecord_gw_last_invoice_date', search.Operator.EQUALTO, 0]]);

    _filterArray.push('and')
    _filterArray.push(['custrecord_gw_assignlog_yearmonth', 'is', year_month])
    _filterArray.push('and')
    _filterArray.push([
      ['custrecord_gw_assignlog_status', 'is', '11'],
      'or',
      ['custrecord_gw_assignlog_status', 'is', '12'],
    ])

    _assignLogSearch.filterExpression = _filterArray
    //alert('_filterArray='+JSON.stringify(_filterArray));

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

  //將異動結果回寫到
  function updateCustomerDepositFlowStatus(
    customerdeposit_hiddent_listid,
    egui_number
  ) {
    //共用lock
    var _invoce_control_field_value = gwconfigure.lockInvoceControlFieldId()
    if (typeof customerdeposit_hiddent_listid !== 'undefined') {
      var _idAry = customerdeposit_hiddent_listid.split(',')
      for (var i = 0; i < _idAry.length; i++) {
        var _internalId = _idAry[i]
        if (parseInt(_internalId) > 0) {
          try {
            var values = {}
            values[_invoce_control_field_id] = _invoce_control_field_value
            values[_gw_gui_num_start_field] = egui_number
            values[_gw_gui_num_end_field] = egui_number

            var _id = record.submitFields({
              type: record.Type.CUSTOMER_DEPOSIT,
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
  }

  function onButtonClick() {
    var _eguiEditScriptId = 'customscript_gw_deposit_egui_ui_edit'
    var _eguiEditDeploymentId = 'customdeploy_gw_deposit_egui_ui_edit'
     
    var _internalId = _current_record.id
    if (_internalId != 0) {
      try {
        //undepfunds
        var _sales_order = _current_record.getValue({
          fieldId: 'salesorder',
        })
        
        var _subsidiary = _current_record.getValue({
          fieldId: 'subsidiary'
        })
        var _selected_business_no = getBusinessNoBySubsidiary(_subsidiary)

        var params = {
          select_customer_deposit_id: _internalId,
          select_sales_order: _sales_order,
        }
        window.location = url.resolveScript({
          scriptId: _eguiEditScriptId,
          deploymentId: _eguiEditDeploymentId,
          params: params,
          returnExternalUrl: false,
        })
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }
    }
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
    onButtonClick: constructorWrapper(onButtonClick),
    submitDocument: constructorWrapper(submitDocument),
    fieldChanged: constructorWrapper(fieldChanged),
    sublistChanged: constructorWrapper(sublistChanged),
  }
})