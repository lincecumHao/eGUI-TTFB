/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define([
  'N/config',
  'N/ui/serverWidget',
  'N/record',
  'N/search',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_search_utility',
  '../gw_common_utility/gw_common_configure',
  '../../gw_dao/taxType/gw_dao_tax_type_21',
  '../../gw_dao/carrierType/gw_dao_carrier_type_21',
], function (
  config,
  serverWidget,
  record,
  search,
  invoiceutility,
  dateutility,
  stringutility,
  searchutility,
  gwconfigure,
  taxyype21,
  carriertypedao
) {
  var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數
  var _invoiceActionScriptId = gwconfigure.getGwInvoiceActionScriptId()
  var _invoiceActionDeploymentId = gwconfigure.getGwInvoiceActionDeploymentId()
 
  //部門代碼
  var _default_department_id = ''

  //放公司基本資料
  var _companyObjAry = []

  //商品名稱欄位
  var _ns_item_name_field = invoiceutility.getConfigureValue('ITEM_GROUP', 'ITEM_NAME_FIELD')

  //取得公司資料
  function getCustomerRecord(businessNo) {
    var _companyObj
    try {
      if (_companyObjAry != null) {
        for (var i = 0; i < _companyObjAry.length; i++) {
          var _obj = JSON.parse(JSON.stringify(_companyObjAry[i]))

          if (_obj.ban == businessNo) {
            _companyObj = _obj
            break
          }
        }
      }
    } catch (e) {
      log.debug(e.name, e.message)
    }

    return _companyObj
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  //取得Account資料
  function getAccountName(account_id) {
    var _acctname = ''

    var _record = record.load({
      type: record.Type.ACCOUNT,
      id: account_id,
      isDynamic: true,
    })

    if (typeof _record !== 'undefined') {
      _acctname = _record.getValue({
        fieldId: 'acctname',
      })
    }
    return _acctname
  }

  //取得客戶資料
  function getCustomerInformation(customer_id) {
    var _customerRecord = record.load({
      type: record.Type.CUSTOMER,
      id: customer_id,
      isDynamic: true,
    })

    var entityid = _customerRecord.getValue({
      fieldId: 'entityid',
    })
    var _customer_buyer_name = _customerRecord.getValue({
      fieldId: 'companyname',
    })
    var _customer_buyer_email = _customerRecord.getValue({
      fieldId: 'email',
    })
    var _customer_buyer_identifier = _customerRecord.getValue({
      fieldId: 'vatregnumber',
    })
    //統一編號
    var _gw_ban_number = _customerRecord.getValue({
      fieldId: 'custentity_gw_tax_id_number',
    })
    var _customer_address = _customerRecord.getValue({
      fieldId: 'defaultaddress',
    })

    var _jsonObj = {
      entityid: entityid,
      companyname: _customer_buyer_name,
      email: _customer_buyer_email,
      vatregnumber: _gw_ban_number,
      defaultaddress: _customer_address,
    }

    return _jsonObj
  }

  //處理稅別資料
  var _taxObjAry = []

  function loadAllTaxInformation() {
    try {
	  var _all_tax_types = taxyype21.getAll()
	  log.debug('get all_tax_types', JSON.stringify(_all_tax_types))
 
	  for (var i=0; i<_all_tax_types.length; i++) {
		   var _tax_json_obj = _all_tax_types[i]
		   var _ns_tax_json_obj = _tax_json_obj.taxCodes
		   log.debug('get _ns_tax_json_obj', JSON.stringify(_ns_tax_json_obj))
		   var _netsuite_id_value = ''
		   var _netsuite_id_text = ''
		   if (_ns_tax_json_obj.length != 0) {
              _netsuite_id_value = _ns_tax_json_obj.value //111;
              _netsuite_id_text = _ns_tax_json_obj.text //Jul 2020;
           }
		   
		   var _obj = {
			  voucher_property_id: _tax_json_obj.name, //TAX_WITH_TAX
			  voucher_property_value: _tax_json_obj.value, //1
			  voucher_property_note: _tax_json_obj.text, //應稅
			  netsuite_id_value: _netsuite_id_value, //8(NS internalID)
			  netsuite_id_text: _netsuite_id_text,   //VAT_TW TAX 5%-TW(NS Text)
		   }

		   _taxObjAry.push(_obj)
		   
	  } 
    } catch (e) {
      log.error(e.name, e.message)
    }
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

  
  //取得賣方公司資料
  function getSellerInfo(businessNo) {
    var _companyObj
    try {
		 var _businessSearch = search
				  .create({
					type: 'customrecord_gw_business_entity',
					columns: ['custrecord_gw_be_tax_id_number', 'custrecord_gw_be_gui_title', 'custrecord_gw_be_business_address', 'custrecord_gw_be_contact_email'],
					filters: ['custrecord_gw_be_tax_id_number', 'is', businessNo]
				  })
				  .run()
				  .each(function (result) {
					var _internalid = result.id

					var _tax_id_number = result.getValue({
					  name: 'custrecord_gw_be_tax_id_number',
					})
					var _be_gui_title = result.getValue({
					  name: 'custrecord_gw_be_gui_title',
					})
					var _business_address = result.getValue({
					  name: 'custrecord_gw_be_business_address',
					})
					var _contact_email = result.getValue({
					  name: 'custrecord_gw_be_contact_email',
					})
					
					_companyObj = {
						'tax_id_number':_tax_id_number,
						'be_gui_title':_be_gui_title,
						'business_address':_business_address,
						'contact_email':_contact_email
					}
 
					return true
				  }) 
	  
       
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _companyObj
  }
  //顯示畫面
  function createFormHeader(apply_business_no, form) {
	/////////////////////////////////////////////////////////////
    //load company information
	var _seller_obj = getSellerInfo(apply_business_no) 
    var _taxid = _seller_obj.tax_id_number
    var _companyname = _seller_obj.be_gui_title
    var _mainaddress_text = _seller_obj.business_address
    //暫借欄位做統編
    var _ban = _taxid
    var _legalname = _companyname
    ////////////////////////////////////////////////////////////////////////////////////////////
     /////////////////////////////////////////////////////////////
    var _row01_fieldgroupid = form.addFieldGroup({
      id: 'row01_fieldgroupid',
      label: '憑證資訊',
    })

    //公司統編
    var _company_ban = form.addField({
      id: 'custpage_company_ban',
      type: serverWidget.FieldType.TEXT,
      label: '公司統編',
      container: 'row01_fieldgroupid',
    })
    _company_ban.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //公司地址
    var _company_address = form.addField({
      id: 'custpage_company_address',
      type: serverWidget.FieldType.TEXT,
      label: '公司地址',
      container: 'row01_fieldgroupid',
    })
    _company_address.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //公司名稱
    var _company_name = form.addField({
      id: 'custpage_company_name',
      type: serverWidget.FieldType.TEXT,
      label: '公司名稱',
      container: 'row01_fieldgroupid',
    })
    _company_name.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    })

    _company_ban.defaultValue = _ban
    _company_address.defaultValue = _mainaddress_text
    _company_name.defaultValue = _legalname
    /////////////////////////////////////////////////////////////
    //發票類型
    var _cashsale_type = form.addField({
      id: 'custpage_invoice_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票類型',
      container: 'row01_fieldgroupid',
    })
    _cashsale_type.addSelectOption({
      value: '07',
      text: '一般稅發票',
    })

    //印表機類別
    var _print_type = form.addField({
      id: 'custpage_print_type',
      type: serverWidget.FieldType.TEXT,
      label: '印表機類別',
      container: 'row01_fieldgroupid',
    })
    _print_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //發票資料格式
    var _mig_type = form.addField({
      id: 'custpage_mig_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票資料格式',
      container: 'row01_fieldgroupid',
    })
    _mig_type.addSelectOption({
      value: 'B2C',
      text: '存證',
    })
    //發票備註
    var _main_remark = form.addField({
      id: 'custpage_main_remark',
      type: serverWidget.FieldType.RICHTEXT,
      label: '發票備註',
      container: 'row01_fieldgroupid',
    })
    //字軌使用方式 _defaultAssignLogType
    var _selectDeductionPeriod = form.addField({
      id: 'custpage_allowance_log_type',
      type: serverWidget.FieldType.SELECT,
      label: '是否上傳憑證',
      container: 'row01_fieldgroupid',
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'EGUI',
      text: '上傳',
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'NONE',
      text: '不上傳',
    })

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //客戶名稱
    var _customer_id = form.addField({
      id: 'custpage_customer_id',
      type: serverWidget.FieldType.SELECT,
      label: '客戶代碼',
      source: 'CUSTOMER',
      container: 'row01_fieldgroupid'
    })  
    _customer_id.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    _customer_id.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //公司統編
    var _buyer_identifier = form.addField({
      id: 'custpage_buyer_identifier',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司統編',
      container: 'row01_fieldgroupid',
    })
    _buyer_identifier.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //公司名稱
    var _buyer_name = form.addField({
      id: 'custpage_buyer_name',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司名稱',
      container: 'row01_fieldgroupid',
    })
    _buyer_name.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //買方E-mail
    var _buyer_email = form.addField({
      id: 'custpage_buyer_email',
      type: serverWidget.FieldType.EMAIL,
      label: '買方E-mail',
      container: 'row01_fieldgroupid',
    })
    _buyer_email.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //買方地址
    var _customs_buyer_address = form.addField({
      id: 'custpage_buyer_address',
      type: serverWidget.FieldType.TEXT,
      label: '買方地址',
      container: 'row01_fieldgroupid',
    })
    _customs_buyer_address.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    ////////////////////////////////////////////////////////////////////////////////////////////////
    //載具類別
    var _carrier_type = form.addField({
      id: 'custpage_carrier_type',
      type: serverWidget.FieldType.SELECT,
      label: '載具類別',
      container: 'row01_fieldgroupid',
    })
    _carrier_type.addSelectOption({
      value: '',
      text: '-----',
    })
    ////////////////////////////////////////////////////////////////////
    var _all_carry_types = carriertypedao.getAll()
	log.debug('get _all_carry_types', JSON.stringify(_all_carry_types))
	for (var i=0; i<_all_carry_types.length; i++) {
		 var _carry_json_obj = _all_carry_types[i]
		 var _carry_text = _carry_json_obj.text
		 var _carry_id = _carry_json_obj.id
		 
		 _carrier_type.addSelectOption({
		      value: _carry_id,
		      text: _carry_text,
	     }) 
	} 
    //////////////////////////////////////////////////////////////////// 
    _carrier_type.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })

    //載具號碼
    var _carrier_id_1 = form.addField({
      id: 'custpage_carrier_id_1',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-1',
      container: 'row01_fieldgroupid',
    })
    var _carrier_id_2 = form.addField({
      id: 'custpage_carrier_id_2',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-2',
      container: 'row01_fieldgroupid',
    }) 
    //捐贈碼
    var _npo_ban = form.addField({
      id: 'custpage_npo_ban',
      type: serverWidget.FieldType.TEXT,
      label: '捐贈碼',
      container: 'row01_fieldgroupid',
    })
    //通關註記
    var _customs_clearance_mark = form.addField({
      id: 'custpage_customs_clearance_mark',
      type: serverWidget.FieldType.SELECT,
      label: '通關註記',
      container: 'row01_fieldgroupid',
    })
    _customs_clearance_mark.addSelectOption({
      value: '1',
      text: '經海關',
    })
    _customs_clearance_mark.addSelectOption({
      value: '2',
      text: '不經海關',
    })
    _customs_clearance_mark.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    //課稅別
    var _tax_type = form.addField({
      id: 'custpage_tax_type',
      type: serverWidget.FieldType.SELECT,
      label: '課稅別',
      container: 'row01_fieldgroupid',
    })
    _tax_type.addSelectOption({
      value: '1',
      text: '應稅(一般稅率)',
    })
    _tax_type.addSelectOption({
      value: '2',
      text: '零稅率',
    })
    _tax_type.addSelectOption({
      value: '3',
      text: '免稅',
    })
    _tax_type.addSelectOption({
      value: '4',
      text: '特種稅',
    })
    _tax_type.addSelectOption({
      value: '9',
      text: '混合稅',
    })
    _tax_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })

    //稅率
    var _tax_rate = form.addField({
      id: 'custpage_tax_rate',
      type: serverWidget.FieldType.SELECT,
      label: '稅率%',
      container: 'row01_fieldgroupid',
    })
    _tax_rate.addSelectOption({
      value: '5',
      text: '5',
    })
    _tax_rate.addSelectOption({
      value: '0',
      text: '0',
    })
    _tax_rate.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
    //額外備註
    var _hidden_voucher_extra_memo = form.addField({
      id: 'custpage_voucher_extra_memo',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'Extra Memo',
      container: 'row01_fieldgroupid',
    })
    _hidden_voucher_extra_memo.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
    //未稅銷售額
    var _sales_amount = form.addField({
      id: 'custpage_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '銷售額',
      container: 'row01_fieldgroupid',
    })
    _sales_amount.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    _sales_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //折讓金額
    var _sales_discount_amount = form.addField({
      id: 'custpage_sales_discount_amount',
      type: serverWidget.FieldType.TEXT,
      label: '折扣金額',
      container: 'row01_fieldgroupid',
    })
    _sales_discount_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _sales_discount_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })

    //總稅額
    var _tax_amount = form.addField({
      id: 'custpage_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅額',
      container: 'row01_fieldgroupid',
    })
    _tax_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //總金額
    var _total_amount = form.addField({
      id: 'custpage_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總金額',
      container: 'row01_fieldgroupid',
    })
    _total_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
        
    //NE-241 小計含稅總金額
    var _sum_item_total_amount_field = form.addField({
      id: 'custpage_sum_item_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '小計含稅總金額',
      container: 'row01_fieldgroupid'
    })
    _sum_item_total_amount_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN
    })
    
    //憑證日期
    var _select_voucher_date = form.addField({
      id: 'custpage_select_voucher_date',
      type: serverWidget.FieldType.DATE,
      label: '憑證日期',
      container: 'row01_fieldgroupid',
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //字軌使用方式
    var _row05_fieldgroupid = form.addFieldGroup({
      id: 'row05_fieldgroupid',
      label: '字軌分配條件',
    })
    //部門代碼
    var _dept_code = form.addField({
      id: 'custpage_dept_code',
      type: serverWidget.FieldType.SELECT,
      label: '發票部門',
      container: 'row05_fieldgroupid',
    })
    _dept_code.addSelectOption({
      value: '',
      text: 'NONE',
    })
    var _deptCodeSearch = search
      .create({
        type: search.Type.DEPARTMENT,
        columns: ['internalid', 'name'],
      })
      .run()
      .each(function (result) {
        var _internalid = result.id
        var _entityid = result.getValue({
          name: 'internalid',
        })
        var _name = result.getValue({
          name: 'name',
        })

        _dept_code.addSelectOption({
          value: _internalid,
          text: _internalid + '-' + _name,
        })
        return true
      })
    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_classification',
      type: serverWidget.FieldType.SELECT,
      label: '發票分類',
      container: 'row05_fieldgroupid',
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE',
    })
    var _classificationSearch = search
      .create({
        type: search.Type.CLASSIFICATION,
        columns: ['internalid', 'name'],
      })
      .run()
      .each(function (result) {
        var _internalid = result.id
        var _entityid = result.getValue({
          name: 'internalid',
        })
        var _name = result.getValue({
          name: 'name',
        })

        _selectClassification.addSelectOption({
          value: _internalid,
          text: _internalid + '-' + _name,
        })
        return true
      })

    //////////////////////////////////////////////////////////////////////
    var _row02_fieldgroupid = form.addFieldGroup({
      id: 'row02_fieldgroupid',
      label: '手開發票開立條件',
    })
    var _eguiFormatCode = form.addField({
      id: 'custpage_egui_format_code',
      type: serverWidget.FieldType.SELECT,
      label: '格式代號 *',
      container: 'row02_fieldgroupid',
    })
    _eguiFormatCode.addSelectOption({
      value: '31-01',
      text: '31-銷項三聯式[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '31-05',
      text: '31-銷項電子計算機統一發票[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '32-02',
      text: '32-銷項二聯式[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '32-03',
      text: '32-銷項二聯式收銀機統一發票[裝訂數:250張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '35-06',
      text: '35-銷項三聯式收銀機統一發票[裝訂數:250張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '35-07',
      text: '35-一般稅額電子發票[裝訂數:50張]',
      isSelected: true
    })

    //人工輸入發票號碼
    var _manual_voucher_number = form.addField({
      id: 'custpage_manual_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '手開發票號碼',
      container: 'row02_fieldgroupid',
    })
    ///////////////////////////////////////////////////////////////////////////////////////////
    //憑證開立方式
    var _voucherOpenTypeField = form.addField({
      id: 'custpage_voucher_open_type',
      type: serverWidget.FieldType.TEXT,
      label: '憑證開立方式',
      container: 'row01_fieldgroupid',
    })
    _voucherOpenTypeField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    ///////////////////////////////////////////////////////////////////////////////////////////
  }

  var _sumDiscountAmount = 0
  var _sumSalesAmount = 0
  var _sumTaxAmount = 0
  var _sumTotalAmount = 0

  var _ns_SumTaxAmount = 0
  var _ns_SumTotalAmount = 0

  function createCashSaleDetails(form, selected_cash_sale_Id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'cashsalesublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS-商品清單',
    })
    //sublist.addMarkAllButtons();

    var _idField = sublist.addField({
      id: 'customer_search_cashsale_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _numberField = sublist.addField({
      id: 'customer_search_cashsale_number',
      label: 'Invoice Number',
      type: serverWidget.FieldType.TEXT,
    })
    _numberField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //放dept_code
    var _deptCodeField = sublist.addField({
      id: 'customer_search_cashsale_deptcode',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _deptCodeField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //放classfication
    var _classficationField = sublist.addField({
      id: 'customer_search_cashsale_class',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _classficationField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //Discount
    var _discountField = sublist.addField({
      id: 'customer_search_cashsale_discount',
      label: 'Discount Item',
      type: serverWidget.FieldType.TEXT,
    })
    _discountField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _seqField = sublist.addField({
      id: 'customer_search_cashsale_seq',
      type: serverWidget.FieldType.TEXT,
      label: '順序',
    })

    var _itemNameField = sublist.addField({
      id: 'custpage_item_name',
      type: serverWidget.FieldType.TEXT,
      label: '名稱',
    })
    _itemNameField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })

    var _taxRateField = sublist.addField({
      id: 'customer_search_cashsale_tax_rate',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT,
    })
    _taxRateField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _taxRateNoteField = sublist.addField({
      id: 'customer_search_cashsale_tax_rate_note',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT,
    })

    var _taxCodeField = sublist.addField({
      id: 'customer_search_cashsale_tax_code',
      label: '稅別',
      type: serverWidget.FieldType.TEXT,
    })
    _taxCodeField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    sublist.addField({
      id: 'custpage_cashsale_item_unit',
      type: serverWidget.FieldType.TEXT,
      label: '單位',
    })
    sublist.addField({
      id: 'custpage_unit_price',
      type: serverWidget.FieldType.TEXT,
      label: '單價',
    })
    sublist.addField({
      id: 'custpage_item_quantity',
      type: serverWidget.FieldType.TEXT,
      label: '數量',
    })
    sublist.addField({
      id: 'custpage_item_amount',
      type: serverWidget.FieldType.TEXT,
      label: '小計(未稅)',
    })
    var _itemRemarkField = sublist.addField({
      id: 'custpage_item_remark',
      type: serverWidget.FieldType.TEXT,
      label: '明細備註',
    })
    _itemRemarkField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })
    /////////////////////////////////////////////////////////////////////////////////////////
    //20201105 walter modify
    var _itemTaxAmountField = sublist.addField({
      id: 'custpage_cashsale_item_tax_amount',
      label: 'Item Tax Amount',
      type: serverWidget.FieldType.TEXT,
    })
    _itemTaxAmountField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _itemTotalAmountField = sublist.addField({
      id: 'custpage_cashsale_item_total_amount',
      label: 'Item Toatl Amount',
      type: serverWidget.FieldType.TEXT,
    })
    _itemTotalAmountField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _totalTaxAmountField = sublist.addField({
      id: 'custpage_cashsale_total_tax_amount',
      label: 'Total Tax Amount',
      type: serverWidget.FieldType.TEXT,
    })
    _totalTaxAmountField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _itemTotalAmountField = sublist.addField({
      id: 'custpage_cashsale_total_sum_amount',
      label: 'Sum Toatl Amount',
      type: serverWidget.FieldType.TEXT,
    })
    _itemTotalAmountField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    /////////////////////////////////////////////////////////////////////////////////////////
    //1.處理 Invoice Detail Items
    var _selectDepartment = ''
    var _selectClassification = ''
    var _mySearch = search.load({
      id: 'customsearch_gw_cash_sale_detail_search',
    })
    var _filterArray = []
    if (selected_cash_sale_Id != null) {
      var _internalIdAry = selected_cash_sale_Id.split(',')
      _filterArray.push(['internalid', 'anyof', _internalIdAry])
    }
    ////////////////////////////////////////////////////////////////
    _filterArray.push('and')
    _filterArray.push(['recordtype', 'is', 'cashsale'])
    //_filterArray.push('and');
    //_filterArray.push(['mainline','is', false]);
    _filterArray.push('and')
    _filterArray.push(['taxline', 'is', false]) //擋稅別科目
    _filterArray.push('and')
    _filterArray.push(['cogs', 'is', false]) //擋庫存及成本科目
    ////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    log.debug('_filterArray', JSON.stringify(_filterArray))
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    //客戶代碼
    var _customer_id = 0
    //稅率
    var _tax_rate = 0
    var _ns_tax_type_code = '-1'

    //額外備註
    var _total_extra_memo = ''

    var _index_tranid = ''
    var _index_date = '0'
    var _index_trandate
    
    //發票備註
    var _gw_gui_main_memo = ''

    //地址
    var _companyObj
    var _customer_ban = ''
    var _company_name = ''
    var _company_address = ''

    //稅別資料
    var _taxObj
    var _hasZeroTax = false

    var _cashsale_sales_amount = 0
    var _cashsale_free_sales_amount = 0
    var _cashsale_zero_sales_amonut = 0
    
    ////////////////////////////////////////////////////////////
    //載具類別
    var _gw_gui_carrier_type = ''
   	var _gw_gui_carrier_id_1 = ''
    var _gw_gui_carrier_id_2 = ''
    //捐贈代碼
   	var _gw_gui_donation_code = ''
    ////////////////////////////////////////////////////////////

    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))

      var _recordType = _result.recordType //cashsale
      var _id = _result.id //948
      var _valueObj = _result.values //object
      var _mainline = _result.values.mainline
      log.debug('_mainline', '_mainline=' + _mainline)

      log.debug('result', JSON.stringify(result))

      var _trandate = _result.values.trandate
      var _dateStr = dateutility.getVoucherDateByDate(_trandate)
      if (
        stringutility.convertToFloat(_dateStr) >
        stringutility.convertToFloat(_index_date)
      ) {
        _index_date = _dateStr
        _index_trandate = _trandate
      }

      var _tranid = _result.values.tranid //AZ10000019

      var _entityValue = 0 //529
      var _entityText = '' //11 se06_company公司
      if (_result.values.entity.length != 0) {
        _entityValue = _result.values.entity[0].value //529
        _entityText = _result.values.entity[0].text //11 se06_company公司
      }
      
      _gw_gui_main_memo = _result.values.custbody_gw_gui_main_memo
      
      //Invoice統編
      _customer_ban = _result.values.custbody_gw_tax_id_number //99999997
      if (stringutility.trim(_company_name) == '') {
        _company_name = _result.values.custbody_gw_gui_title
        _company_address = _result.values.custbody_gw_gui_address
      }
      ///////////////////////////////////////////////////////////////////////
	  //載具類別 
	  if (_result.values.custbody_gw_gui_carrier_type.length != 0) {
		  _gw_gui_carrier_type = _result.values.custbody_gw_gui_carrier_type[0].value   
	  } 
	  _gw_gui_carrier_id_1 = _result.values.custbody_gw_gui_carrier_id_1
	  _gw_gui_carrier_id_2 = _result.values.custbody_gw_gui_carrier_id_2
	  //捐贈代碼
	  _gw_gui_donation_code = _result.values.custbody_gw_gui_donation_code
      ///////////////////////////////////////////////////////////////////////

      var _accountValue = '' //54
      var _accountText = '' //4000 Sales
      if (_result.values.account.length != 0) {
        _accountValue = _result.values.account[0].value //54
        _accountText = _result.values.account[0].value //4000 Sales
      }

      var _amount = stringutility.convertToFloat(_result.values.amount) //31428.57(未稅)
      //20201105 walter modify
      //NS 的總稅額
      var _ns_total_tax_amount = stringutility.convertToFloat(
        _result.values.taxtotal
      ) //稅額總計 -5.00
      //NS 的總金額小計
      var _ns_total_sum_amount = stringutility.convertToFloat(
        _result.values.total
      ) //金額總計(含稅)

      //NS 的稅額
      var _ns_item_tax_amount = stringutility.convertToFloat(
        _result.values.taxamount
      ) //稅額總計 -5.00
      //NS 的Item金額小計
      var _ns_item_total_amount = stringutility.convertToFloat(
        _result.values.formulacurrency
      ) //Item金額小計

      var _linesequencenumber = _result.values.linesequencenumber //1
      var _line = _result.values.line //1
      var _itemtype = _result.values.itemtype //InvtPart

      var _prodcut_id = ''
	  var _prodcut_text = ''
	  if (_result.values.item.length != 0) {
	    _prodcut_id = _result.values.item[0].value //10519
	    _prodcut_text = _result.values.item[0].text //NI20200811000099
	  }
      var _memo = _result.values['memo']
      //var _item_salesdescription = _result.values['item.salesdescription']
      var _item_displayname = _prodcut_text+_result.values[_ns_item_name_field] //SONY電視機
      //if (stringutility.trim(_memo) != '') _item_displayname = _memo

      var _item_taxItem_rate = _result.values['taxItem.rate'] //5.00%
      if (_item_taxItem_rate == '') {
        _item_taxItem_rate = '0'
      } else {
        //去除%符號
        _item_taxItem_rate = _item_taxItem_rate.replace('%', '')
      }
      _tax_rate = _item_taxItem_rate

      var _item_salestaxcodeValue = '' //10
      var _item_salestaxcodeText = '' //VAT-BIZ05

      _item_salestaxcodeText = _result.values['taxItem.itemid'] //VAT-BIZ05
      if (_result.values['taxItem.internalid'].length != 0) {
        _item_salestaxcodeValue = _result.values['taxItem.internalid'][0].value //10

        //抓稅別資料
        _taxObj = getTaxInformation(_item_salestaxcodeValue)
        log.debug(
          '_item_salestaxcodeValue',
          '_ns_tax_type_code=' +
            _ns_tax_type_code +
            '  ,item_salestaxcodeValue=' +
            _item_salestaxcodeValue +
            '  ,_taxObj.voucher_property_value=' +
            _taxObj.voucher_property_value
        )
        if (typeof _taxObj !== 'undefined') {
          if (_taxObj.voucher_property_value == '2') _hasZeroTax = true //零稅率

          if (_ns_tax_type_code == '-1') {
            _ns_tax_type_code = _taxObj.voucher_property_value
          }
          if (
            _ns_tax_type_code.indexOf(_taxObj.voucher_property_value) == -1 ||
            _ns_tax_type_code == '9'
          ) {
            _ns_tax_type_code = '9'
          }
        }
      }

      var _rate = _result.values.rate //單價3142.85714286
      var _department = ''
      if (_result.values.department.length != 0) {
        _department = _result.values.department[0].value
        _selectDepartment = _department + ''
      }
      var _class = ''
      if (_result.values.class.length != 0) {
        _class = _result.values.class[0].value
        _selectClassification = _class
      }
      var _quantity = _result.values.quantity
      //default
      if (_quantity.trim().length==0)_quantity='1'
      //單位
      var _unitabbreviation = _result.values.unitabbreviation

      if (_index_tranid != _tranid) {
        _index_tranid = _tranid
      }
      //明細備註
      var _item_memo = _result.values.custcol_gw_item_memo

      if (_itemtype === 'Discount') {
    	  //20210913 walter modify 取消Discount 限制
          //折扣項目
          //_sumDiscountAmount += stringutility.convertToFloat(_amount)
          //Discount 要再紀錄近來,不然會少
          //_sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
      }
      //主檔才做
      if (_recordType == 'cashsale' && _mainline == '*') {
        var _ns_tax_total_amount = stringutility.convertToFloat(
          _result.values.taxtotal
        ) //稅額總計 -5.00
        var _ns_total_amount = stringutility.convertToFloat(
          _result.values.total
        ) //金額總計
        //grossamount
        _ns_SumTotalAmount += _ns_total_amount
        _ns_SumTaxAmount += _ns_tax_total_amount
      }

      //只放 Sales Items 進來 (Discount Item 要排除)
      if (
          _recordType == 'cashsale' &&
          _mainline != '*' 
          //20210913 walter modify 取消Discount 限制
          //&& _itemtype != 'Discount'
      ) {
        log.debug('get _taxObj', JSON.stringify(_taxObj))
        if (typeof _taxObj !== 'undefined') {
          if (_taxObj.voucher_property_value == '1') {
            _cashsale_sales_amount += _amount
          } else if (_taxObj.voucher_property_value == '2') {
            _cashsale_zero_sales_amonut += _amount
          } else if (_taxObj.voucher_property_value == '3') {
            _cashsale_free_sales_amount += _amount
          }
        }
        //抓第1筆當部門
        if (_default_department_id.length == 0) {
          _default_department_id = _selectDepartment
        }
        _customer_id = _entityValue

        sublist.setSublistValue({
          id: 'customer_search_cashsale_id',
          line: row,
          value: _id,
        })
        sublist.setSublistValue({
          id: 'customer_search_cashsale_number',
          line: row,
          value: stringutility.trimOrAppendBlank(_tranid),
        })
        sublist.setSublistValue({
          id: 'customer_search_cashsale_seq',
          line: row,
          value: _linesequencenumber,
        })
        sublist.setSublistValue({
          id: 'customer_search_cashsale_deptcode',
          line: row,
          value: stringutility.trimOrAppendBlank(_department),
        })
        sublist.setSublistValue({
          id: 'customer_search_cashsale_class',
          line: row,
          value: stringutility.trimOrAppendBlank(_class),
        })

        sublist.setSublistValue({
          id: 'custpage_cashsale_item_unit',
          line: row,
          value: stringutility.trimOrAppendBlank(_unitabbreviation),
        })

        sublist.setSublistValue({
          id: 'customer_search_cashsale_discount',
          line: row,
          value: stringutility.trimOrAppendBlank(_itemtype),
        })

        sublist.setSublistValue({
          id: 'customer_search_cashsale_tax_code',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_salestaxcodeValue),
        })

        if (typeof _taxObj !== 'undefined') {
          var _tax_rate_note =
            _taxObj.voucher_property_note +
            ' - ' +
            Math.round(_item_taxItem_rate)
          sublist.setSublistValue({
            id: 'customer_search_cashsale_tax_rate_note',
            line: row,
            value: stringutility.trimOrAppendBlank(_tax_rate_note),
          })
        }

        sublist.setSublistValue({
          id: 'customer_search_cashsale_tax_rate',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_taxItem_rate),
        })

        sublist.setSublistValue({
          id: 'custpage_item_name',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_displayname),
        })

        sublist.setSublistValue({
          id: 'custpage_unit_price',
          line: row,
          value: stringutility.trimOrAppendBlank(_rate),
        })
        sublist.setSublistValue({
          id: 'custpage_item_quantity',
          line: row,
          value: stringutility.trimOrAppendBlank(_quantity),
        })
        sublist.setSublistValue({
          id: 'custpage_item_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_amount),
        })
        sublist.setSublistValue({
          id: 'custpage_item_remark',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_memo),
        })

        sublist.setSublistValue({
          id: 'custpage_cashsale_item_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_tax_amount),
        })
        sublist.setSublistValue({
          id: 'custpage_cashsale_item_total_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_total_amount),
        })

        sublist.setSublistValue({
          id: 'custpage_cashsale_total_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_tax_amount),
        })
        sublist.setSublistValue({
          id: 'custpage_cashsale_total_sum_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_sum_amount),
        })

        row++
        /////////////////////////////////////////////////////////////////////////////////////////
        //處理總計
        _sumSalesAmount += stringutility.convertToFloat(_amount)
        _sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
        _sumTotalAmount = _sumSalesAmount + _sumDiscountAmount + _sumTaxAmount
        log.debug(
          '_sumTotalAmount',
          '_sumSalesAmount=' +
            _sumSalesAmount +
            ' ,_sumTaxAmount=' +
            _sumTaxAmount +
            ' ,_sumTotalAmount=' +
            _sumTotalAmount
        )
        /////////////////////////////////////////////////////////////////////////////////////////
      }
      return true
    })

    var _select_voucher_date = form.getField({
      id: 'custpage_select_voucher_date',
    })
    _select_voucher_date.defaultValue = _index_trandate
    ////////////////////////////////////////////////////////////////////////////////////////
    //2. 處理Header的客戶資料
    //客戶代碼
    var _custpage_customer_id = form.getField({
      id: 'custpage_customer_id',
    })
    _custpage_customer_id.defaultValue = _customer_id
 
    var _custpage_main_remark = form.getField({
        id: 'custpage_main_remark'
    })
    _custpage_main_remark.defaultValue = _gw_gui_main_memo
    
    var _dept_codeField = form.getField({
      id: 'custpage_dept_code',
    })
    _dept_codeField.defaultValue = _default_department_id

    var _classificationField = form.getField({
      id: 'custpage_classification',
    })
    _classificationField.defaultValue = _selectClassification
    ////////////////////////////////////////////////////////////////////////////////////////
    log.debug(
      '_customer_id',
      '_customer_id=' +
        _customer_id +
        ', _customer_ban=' +
        _customer_ban +
        ' ,_company_name=' +
        _company_name
    )
    //客戶資料
    if (_customer_id > 0) {
      var _custpage_buyer_identifier = form.getField({
        id: 'custpage_buyer_identifier',
      })
      _custpage_buyer_identifier.defaultValue = _customer_ban

      var _custpage_buyer_name = form.getField({
        id: 'custpage_buyer_name',
      })
      _custpage_buyer_name.defaultValue = _company_name

      var _custpage_buyer_email = form.getField({
        id: 'custpage_buyer_email',
      })
      var _custpage_buyer_address = form.getField({
        id: 'custpage_buyer_address',
      })
      _custpage_buyer_address.defaultValue = _company_address

      if (typeof _companyObj !== 'undefined') {
        _custpage_buyer_email.defaultValue = _companyObj.email
      }
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    //控制通關註記選項
    if (_hasZeroTax == true) {
      var _custpage_customs_clearance_mark = form.getField({
        id: 'custpage_customs_clearance_mark',
      })
      _custpage_customs_clearance_mark.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL,
      })
    }
    var _custpage_tax_type = form.getField({
      id: 'custpage_tax_type',
    })
    _custpage_tax_type.defaultValue = _ns_tax_type_code
    log.debug('ns_tax_type_code', _ns_tax_type_code)
    
    //20231214
    var _custpage_tax_rate = form.getField({
        id: 'custpage_tax_rate'
    })
    if (_ns_tax_type_code=='1' || _ns_tax_type_code=='9'){
      	_custpage_tax_rate.defaultValue = '5'
    } else {
      	_custpage_tax_rate.defaultValue = '0'
    } 
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
    //處理總計計部分-START
    var _sales_amount_field = form.getField({
      id: 'custpage_sales_amount',
    })
    _sales_amount_field.defaultValue = _sumSalesAmount.toFixed(_numericToFixed)

    var _sales_discount_amount = form.getField({
      id: 'custpage_sales_discount_amount',
    })
    _sales_discount_amount.defaultValue = _sumDiscountAmount.toFixed(
      _numericToFixed
    )

    //3. 重新計算稅額
    var _tax_amount_field = form.getField({
      id: 'custpage_tax_amount',
    })
    _tax_amount_field.defaultValue = _ns_SumTaxAmount

    var _toatl_amount_field = form.getField({
      id: 'custpage_total_amount',
    })
    _toatl_amount_field.defaultValue = _ns_SumTotalAmount.toFixed(
      _numericToFixed
    )
    
    //NE-241 小計含稅總金額
    var _sum_item_total_amount_field = form.getField({
      id: 'custpage_sum_item_total_amount'
    })    
    _sum_item_total_amount_field.defaultValue = (_sumSalesAmount+_sumDiscountAmount+_ns_SumTaxAmount).toFixed(_numericToFixed)
 
    //處理總計計部分-START
    /////////////////////////////////////////////////////////////////////////////////////////
    //載具類別
    var _gw_gui_carrier_type_field = form.getField({id: 'custpage_carrier_type'})
    _gw_gui_carrier_type_field.defaultValue = _gw_gui_carrier_type
    var _gw_gui_carrier_id_1_field = form.getField({id: 'custpage_carrier_id_1'})
    _gw_gui_carrier_id_1_field.defaultValue = _gw_gui_carrier_id_1
    var _gw_gui_carrier_id_w_field = form.getField({id: 'custpage_carrier_id_2'})
    _gw_gui_carrier_id_w_field.defaultValue = _gw_gui_carrier_id_2
    //捐贈代碼
    var _gw_gui_donation_code_field = form.getField({id: 'custpage_npo_ban'})
    _gw_gui_donation_code_field.defaultValue = _gw_gui_donation_code
  }
    
  function onRequest(context) {
	var _selected_business_no = context.request.parameters.custpage_businessno
	  log.debug('_selected_business_no', '_selected_business_no=' + _selected_business_no)
    var _select_cash_sale_id = context.request.parameters.select_cash_sale_id

    ///////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-START
    ///////////////////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '電子發票開立作業（現金銷售-憑證開立）',
    })
    //Hiddent Element
    var _hiddenfield = form.addField({
      id: 'custpage_cash_sale_hiddent_buttontype',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hiddenfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //押金List
    var _hiddencustomerdepositlistld = form.addField({
      id: 'custpage_cash_sale_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hiddencustomerdepositlistld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _hiddencustomerdepositlistld.defaultValue = _select_cash_sale_id
    //////////////////////////////////////////////////////////////////////////////////////////
    loadAllTaxInformation()
    /////////////////////////////////////////////////////////////////////////////////////////
    createFormHeader(_selected_business_no, form)

    if (_select_cash_sale_id.length != 0) {
      createCashSaleDetails(form, _select_cash_sale_id)
    }

    /////////////////////////////////////////////////////////////////////////////////////////
    //status, yearMonth, deptCode
    form.addButton({
      id: 'custpage_create_voucher_button',
      label: '開立憑證',
      functionName:
        'submitDocument("' +
        _invoiceActionScriptId +
        '","' +
        _invoiceActionDeploymentId +
        '")',
    })
    form.addButton({
      id: 'custpage_forward_back_button',
      label: '回前一頁',
      functionName: 'backToPage()',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-END
    ///////////////////////////////////////////////////////////////////////////////////////////
    form.clientScriptModulePath = './gw_cash_sale_ui_event.js'

    context.response.writePage(form)
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
