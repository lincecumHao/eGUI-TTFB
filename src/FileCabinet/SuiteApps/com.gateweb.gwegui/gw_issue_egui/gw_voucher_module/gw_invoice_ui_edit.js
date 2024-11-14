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
  'N/format',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_configure',
  '../../gw_dao/taxType/gw_dao_tax_type_21',
  '../../gw_dao/carrierType/gw_dao_carrier_type_21',
  '../../gw_dao/busEnt/gw_dao_business_entity_21',
  '../../gw_dao/settings/gw_dao_egui_config',
  '../gw_dao/gw_transaction_fields',
  '../../library/gw_date_util'
], function (
  config,
  serverWidget,
  record,
  search,
  format,
  invoiceutility,
  dateutility,
  stringutility,
  gwconfigure,
  taxyype21,
  carriertypedao,
  businessEntityDao,
  gwDaoEguiConfig,
  gwTransactionFields,
  gwDateUtil
) {
  var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數
  var _invoiceActionScriptId = gwconfigure.getGwInvoiceActionScriptId()
  var _invoiceActionDeploymentId = gwconfigure.getGwInvoiceActionDeploymentId()

  var _gw_invoice_detail_search_id = gwconfigure.getGwInvoiceDetailSearchId() //Invoice Detail Search
  var _gw_creditmemo_detail_search_id = gwconfigure.getGwCreditmemoDetailSearchId() //Credit Memo Detail Search

  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  var _customer_deposit_text = '顧客押金'
  //部門代碼
  var _default_department_id = ''
	   
  //統計Item金額
  var _sum_item_total_amount = 0

  //商品名稱欄位
  var _ns_item_name_field = invoiceutility.getConfigureValue(
    'ITEM_GROUP',
    'ITEM_NAME_FIELD'
  )

  //放公司基本資料
  var _companyObjAry = []

  var isEGUIDepartmentEnable = true
  var isEGUIClassEnable = true

  var fieldHiddenControl = serverWidget.FieldDisplayType.HIDDEN

  //取得賣方公司資料
  function getSellerInfo(businessNo) {
    var _companyObj
    try {
      var businessEntity = businessEntityDao.getByTaxId(businessNo)
      _companyObj = {
        tax_id_number: businessEntity.taxId, //_tax_id_number,
        be_gui_title: businessEntity.title, // _be_gui_title,
        business_address: businessEntity.address, //_business_address,
        contact_email: businessEntity.repEmail // _contact_email
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _companyObj
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  //放稅別資料
  var _taxObjAry = []

  function loadAllTaxInformation() {
    try {
        var _all_tax_types = taxyype21.getAll().map(function (_tax_json_obj) {
       	var _ns_tax_json_obj = _tax_json_obj.taxCodes
        return {
          voucher_property_id: _tax_json_obj.name.toString(), //TAX_WITH_TAX
          voucher_property_value: _tax_json_obj.value.toString(), //1
          voucher_property_note: _tax_json_obj.text, //應稅
          netsuite_id_value: _ns_tax_json_obj.value || '', //8(NS internalID)
          netsuite_id_text: _ns_tax_json_obj.text || '' //VAT_TW TAX 5%-TW(NS Text)
        }
      })
      log.debug('get all_tax_types', JSON.stringify(_all_tax_types))
      return _all_tax_types
      // log.debug('get all_tax_types', JSON.stringify(_all_tax_types))

      // for (var i = 0; i < _all_tax_types.length; i++) {
      //   var _tax_json_obj = _all_tax_types[i]
      //   var _ns_tax_json_obj = _tax_json_obj.taxCodes
      //   log.debug('get _ns_tax_json_obj', JSON.stringify(_ns_tax_json_obj))
      //   var _netsuite_id_value = ''
      //   var _netsuite_id_text = ''
      //   if (_ns_tax_json_obj.length != 0) {
      //     _netsuite_id_value = _ns_tax_json_obj.value //111;
      //     _netsuite_id_text = _ns_tax_json_obj.text //Jul 2020;
      //   }
      //
      //   var _obj = {
      //     voucher_property_id: _tax_json_obj.name, //TAX_WITH_TAX
      //     voucher_property_value: _tax_json_obj.value, //1
      //     voucher_property_note: _tax_json_obj.text, //應稅
      //     netsuite_id_value: _netsuite_id_value, //8(NS internalID)
      //     netsuite_id_text: _netsuite_id_text //VAT_TW TAX 5%-TW(NS Text)
      //   }
      //
      //   _taxObjAry.push(_obj)
      // }
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //取得稅別資料
  function getTaxInformation(netsuiteId) {
    log.audit({title: 'getTaxInformation - netsuiteId', details: netsuiteId})
    log.audit({title: 'getTaxInformation - _taxObjAry', details: _taxObjAry})
    return _taxObjAry.filter(function (_obj) {
      return _obj.netsuite_id_value.toString() === netsuiteId.toString()
    })[0]
  }
  //取得稅別資料
  function getTaxInformationByTaxId(taxId) {
    return _taxObjAry.filter(function (_obj) {
      return _obj.voucher_property_value.toString() === taxId.toString()
    })[0]
    // var _taxObj
    // try {
    //   if (_taxObjAry != null) {
    //     for (var i = 0; i < _taxObjAry.length; i++) {
    //       var _obj = JSON.parse(JSON.stringify(_taxObjAry[i]))
    //
    //       if (_obj.voucher_property_value == taxId) {
    //         _taxObj = _obj
    //         break
    //       }
    //     }
    //   }
    // } catch (e) {
    //   log.error(e.name, e.message)
    // }
    //
    // return _taxObj
  }

  //轉換成民國年月日(2021/01/18)
  function convertExportDate(export_date) {
    var _tradition_date = '' //民國年月日(1101231)
    log.debug('export_date', export_date)
    try {
      if (export_date.toString().length != 0) {
        var date = new Date(export_date)
        var month =
          date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : date.getMonth() + 1 //months (0-11)
        var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate() //day (1-31)
        var year = date.getFullYear()

        var _formatted_date = year + '' + month + '' + day
        log.debug('formattedDate', _formatted_date)

        _tradition_date = parseInt(_formatted_date - 19110000).toString()
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _tradition_date
  }
  ///////////////////////////////////////////////////////////////////////////////////////////

  //顯示畫面
  function createFormHeader(apply_business_no, form, context) {
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
    //適用零稅率規定
    var _applicable_zero_tax_field = form.addField({
      id: 'custpage_applicable_zero_tax',
      type: serverWidget.FieldType.TEXT,
      label: '適用零稅率規定'
    })
    _applicable_zero_tax_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    
    var _gw_gui_num_start_field = form.addField({
      id: 'custbody_gw_gui_num_start',
      type: serverWidget.FieldType.TEXT,
      label: '發票號碼起號'
    })
    _gw_gui_num_start_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    
    //海關出口單類別
    var _customs_export_category_field = form.addField({
      id: 'custpage_gw_customs_export_category',
      type: serverWidget.FieldType.TEXT,
      label: '海關出口單類別'
    })
    _customs_export_category_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //海關出口號碼
    var _customs_export_no_field = form.addField({
      id: 'custpage_gw_customs_export_no',
      type: serverWidget.FieldType.TEXT,
      label: '海關出口號碼'
    })
    _customs_export_no_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //輸出或結匯日期
    var _customs_export_date_field = form.addField({
      id: 'custpage_gw_customs_export_date',
      type: serverWidget.FieldType.TEXT,
      label: '輸出或結匯日期'
    })
    _customs_export_date_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    ////////////////////////////////////////////////////////////////////////////////////////////////
    var _row01_fieldgroupid = form.addFieldGroup({
      id: 'row01_fieldgroupid',
      label: '憑證資訊'
    })

    //公司統編
    var _company_ban = form.addField({
      id: 'custpage_company_ban',
      type: serverWidget.FieldType.TEXT,
      label: '公司統編',
      container: 'row01_fieldgroupid'
    })
    _company_ban.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //公司地址
    var _company_address = form.addField({
      id: 'custpage_company_address',
      type: serverWidget.FieldType.TEXT,
      label: '公司地址',
      container: 'row01_fieldgroupid'
    })
    _company_address.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //公司名稱
    var _company_name = form.addField({
      id: 'custpage_company_name',
      type: serverWidget.FieldType.TEXT,
      label: '公司名稱',
      container: 'row01_fieldgroupid'
    })
    _company_name.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW
    })
    log.debug('_mainaddress_text=' + _mainaddress_text)

    //_company_ban.defaultValue = _ban
    _company_ban.defaultValue = apply_business_no
    _company_address.defaultValue = _mainaddress_text
    _company_name.defaultValue = _legalname

    //發票類型
    var _invoice_type = form.addField({
      id: 'custpage_invoice_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票類型',
      container: 'row01_fieldgroupid'
    })
    _invoice_type.addSelectOption({
      value: '07',
      text: '一般稅發票'
    })
    //印表機類別
    var _print_type = form.addField({
      id: 'custpage_print_type',
      type: serverWidget.FieldType.TEXT,
      label: '印表機類別',
      container: 'row01_fieldgroupid'
    })
    _print_type.updateDisplayType({
      displayType: fieldHiddenControl
    })

    //發票資料格式
    var _mig_type = form.addField({
      id: 'custpage_mig_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票資料格式',
      container: 'row01_fieldgroupid'
    })
    _mig_type.addSelectOption({
      value: 'B2C',
      text: 'B2C/B2B-存證'
    })
    //發票備註
    var _main_remark = form.addField({
      id: 'custpage_main_remark',
      type: serverWidget.FieldType.TEXTAREA,
      label: '發票備註',
      container: 'row01_fieldgroupid'
    })

    //字軌使用方式 _defaultAssignLogType
    var _selectDeductionPeriod = form.addField({
      id: 'custpage_allowance_log_type',
      type: serverWidget.FieldType.SELECT,
      label: '是否上傳憑證',
      container: 'row01_fieldgroupid'
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'ALL',
      text: '上傳'
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'NONE',
      text: '不上傳'
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
      breakType: serverWidget.FieldBreakType.STARTCOL
    })
    _customer_id.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })
    //公司統編
    var _buyer_identifier = form.addField({
      id: 'custpage_buyer_identifier',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司統編',
      container: 'row01_fieldgroupid'
    })
    _buyer_identifier.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    //公司名稱
    var _buyer_name = form.addField({
      id: 'custpage_buyer_name',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司名稱',
      container: 'row01_fieldgroupid'
    })
    _buyer_name.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    //買方E-mail
    var _buyer_email = form.addField({
      id: 'custpage_buyer_email',
      type: serverWidget.FieldType.EMAIL,
      label: '買方E-mail',
      container: 'row01_fieldgroupid'
    })
    _buyer_email.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    //買方地址
    var _customs_buyer_address = form.addField({
      id: 'custpage_buyer_address',
      type: serverWidget.FieldType.TEXT,
      label: '買方地址',
      container: 'row01_fieldgroupid'
    })
    _customs_buyer_address.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //載具類別
    var _carrier_type = form.addField({
      id: 'custpage_carrier_type',
      type: serverWidget.FieldType.SELECT,
      label: '載具類別',
      container: 'row01_fieldgroupid'
    })
    _carrier_type.addSelectOption({
      value: '',
      text: '-----'
    })
    ////////////////////////////////////////////////////////////////////
    var _all_carry_types = carriertypedao.getAll()
    log.debug('get _all_carry_types', JSON.stringify(_all_carry_types))
    for (var i = 0; i < _all_carry_types.length; i++) {
      var _carry_json_obj = _all_carry_types[i]
      var _carry_text = _carry_json_obj.text
      var _carry_id = _carry_json_obj.id

      _carrier_type.addSelectOption({
        value: _carry_id,
        text: _carry_text
      })
    }
    ////////////////////////////////////////////////////////////////////
    _carrier_type.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL
    })

    //20210913 walter modify 預設抓Invoice
    //載具號碼
    var _carrier_id = form.addField({
      id: 'custpage_carrier_id_1',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-1',
      container: 'row01_fieldgroupid'
    })
    var _carrier_id = form.addField({
      id: 'custpage_carrier_id_2',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-2',
      container: 'row01_fieldgroupid'
    })

    //捐贈碼
    var _npo_ban = form.addField({
      id: 'custpage_npo_ban',
      type: serverWidget.FieldType.TEXT,
      label: '捐贈碼',
      container: 'row01_fieldgroupid'
    })
    //通關註記
    var _customs_clearance_mark = form.addField({
      id: 'custpage_customs_clearance_mark',
      type: serverWidget.FieldType.SELECT,
      label: '通關註記',
      container: 'row01_fieldgroupid'
    })
    _customs_clearance_mark.addSelectOption({
      value: '1',
      text: '1:非經海關'
    })
    _customs_clearance_mark.addSelectOption({
      value: '2',
      text: '2:經海關'
    })
    _customs_clearance_mark.updateDisplayType({
      displayType: fieldHiddenControl
    })

    //課稅別
    var _tax_type = form.addField({
      id: 'custpage_tax_type',
      type: serverWidget.FieldType.SELECT,
      label: '課稅別',
      container: 'row01_fieldgroupid'
    })
    _tax_type.addSelectOption({
      value: '1',
      text: '應稅(一般稅率)'
    })
    _tax_type.addSelectOption({
      value: '2',
      text: '零稅率'
    })
    _tax_type.addSelectOption({
      value: '3',
      text: '免稅'
    })
    _tax_type.addSelectOption({
      value: '4',
      text: '特種稅'
    })
    _tax_type.addSelectOption({
      value: '9',
      text: '混合稅'
    })
    _tax_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    //稅率
    var _tax_rate = form.addField({
      id: 'custpage_tax_rate',
      type: serverWidget.FieldType.SELECT,
      label: '稅率%',
      container: 'row01_fieldgroupid'
    })
    _tax_rate.addSelectOption({
      value: '5',
      text: '5'
    })
    _tax_rate.addSelectOption({
      value: '0',
      text: '0'
    })
    _tax_rate.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })
    //////////////////////////////////////////////////////////////////////////////////////////////

    var _hidden_voucher_extra_memo = form.addField({
      id: 'custpage_voucher_extra_memo',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'Extra Memo',
      container: 'row01_fieldgroupid'
    })
    _hidden_voucher_extra_memo.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
    //未稅銷售額
    var _sales_amount = form.addField({
      id: 'custpage_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '銷售額',
      container: 'row01_fieldgroupid'
    })
    _sales_amount.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL
    })
    _sales_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })
    //折讓金額
    var _sales_discount_amount = form.addField({
      id: 'custpage_sales_discount_amount',
      type: serverWidget.FieldType.TEXT,
      label: '折扣金額',
      container: 'row01_fieldgroupid'
    })
    _sales_discount_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })
    //總稅額
    var _tax_amount = form.addField({
      id: 'custpage_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅額',
      container: 'row01_fieldgroupid'
    })
    _tax_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })

    //總金額
    var _total_amount = form.addField({
      id: 'custpage_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總金額',
      container: 'row01_fieldgroupid'
    })
    _total_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    })
    
    //小計含稅總金額
    var _sum_item_total_amount_field = form.addField({
      id: 'custpage_sum_item_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '小計含稅總金額',
      container: 'row01_fieldgroupid'
    })
    _sum_item_total_amount_field.updateDisplayType({
      displayType: fieldHiddenControl
    })

    //憑證日期
    var _select_voucher_date = form.addField({
      id: 'custpage_select_voucher_date',
      type: serverWidget.FieldType.DATE,
      label: '憑證日期',
      container: 'row01_fieldgroupid'
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //發票使用區間
    var _row02_fieldgroupid = form.addFieldGroup({
      id: 'row02_fieldgroupid',
      label: '手開發票開立條件'
    })
    var _eguiFormatCode = form.addField({
      id: 'custpage_egui_format_code',
      type: serverWidget.FieldType.SELECT,
      label: '格式代號 *',
      container: 'row02_fieldgroupid'
    })
    _eguiFormatCode.addSelectOption({
      value: '31-01',
      text: '31-銷項三聯式[裝訂數:50張]'
    })
    _eguiFormatCode.addSelectOption({
      value: '31-05',
      text: '31-銷項電子計算機統一發票[裝訂數:50張]'
    })
    _eguiFormatCode.addSelectOption({
      value: '32-02',
      text: '32-銷項二聯式[裝訂數:50張]'
    })
    _eguiFormatCode.addSelectOption({
      value: '32-03',
      text: '32-銷項二聯式收銀機統一發票[裝訂數:250張]'
    })
    _eguiFormatCode.addSelectOption({
      value: '35-06',
      text: '35-銷項三聯式收銀機統一發票[裝訂數:250張]'
    })
    _eguiFormatCode.addSelectOption({
      value: '35-07',
      text: '35-一般稅額電子發票[裝訂數:50張]'
    })
    _eguiFormatCode.defaultValue = '35-07'

    //人工輸入發票號碼
    var _manual_voucher_number = form.addField({
      id: 'custpage_manual_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '手開發票號碼',
      container: 'row02_fieldgroupid'
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //字軌使用方式
    var _row05_fieldgroupid = form.addFieldGroup({
      id: 'row05_fieldgroupid',
      label: '字軌分配條件'
    })
    //部門代碼
    var _dept_code = form.addField({
      id: 'custpage_dept_code',
      type: serverWidget.FieldType.SELECT,
      source: 'DEPARTMENT',
      label: '發票部門',
      container: 'row05_fieldgroupid'
    })
    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_classification',
      type: serverWidget.FieldType.SELECT,
      label: '發票分類',
      source: 'CLASSIFICATION',
      container: 'row05_fieldgroupid'
    })
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    //折讓單使用區間
    var _row03_fieldgroupid = form.addFieldGroup({
      id: 'row03_fieldgroupid',
      label: '折讓單開立條件'
    })
    //折讓單發票扣抵期間
    var _selectDeductionPeriod = form.addField({
      id: 'custpage_allowance_deduction_period',
      type: serverWidget.FieldType.SELECT,
      label: '發票扣抵期間',
      container: 'row03_fieldgroupid'
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'this_period',
      text: '本期開始'
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'early_period',
      text: '前期開始'
    })
    _selectDeductionPeriod.addSelectOption({
      value: 'user_selected',
      text: '自選發票'
    })

    var eguiNumber = context.request.parameters.eguiNumber;
    //人工輸入發票號碼
    var _deduction_voucher_number = form.addField({
      id: 'custpage_deduction_egui_number',
      type: serverWidget.FieldType.TEXT,
      label: '扣抵發票號碼',
      container: 'row03_fieldgroupid'
    })
    if(eguiNumber) _deduction_voucher_number.defaultValue = eguiNumber;
    ///////////////////////////////////////////////////////////////////////////////////
    //憑證開立方式
    var _voucherOpenTypeField = form.addField({
      id: 'custpage_voucher_open_type',
      type: serverWidget.FieldType.TEXT,
      label: '憑證開立方式',
      container: 'row01_fieldgroupid'
    })
    _voucherOpenTypeField.updateDisplayType({
      displayType: fieldHiddenControl
    })
  }

  var _sumDiscountAmount = 0
  var _sumSalesAmount = 0
  var _sumTaxAmount = 0
  var _sumTotalAmount = 0

  var _ns_SumTaxAmount = 0
  var _ns_SumTotalAmount = 0

  //重新計算稅額
  var _taxTypeJsonObject = {
    amount_taxtype_0: 0,
    amount_taxtype_1: 0,
    amount_taxtype_2: 0,
    amount_taxtype_5: 0,
    amount_taxtype_15: 0,
    amount_taxtype_25: 0,
    amount_taxtype_total: 0
  }

  //重新計算稅額
  function recaculateTaxContainDiscountItem(discountTotalAmount) {
    var _tax_amount = 0
    var _taxtype_0_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_0']
    ) //未稅金額小計
    var _taxtype_1_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_1']
    ) //未稅金額小計
    var _taxtype_2_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_2']
    ) //未稅金額小計
    var _taxtype_5_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_5']
    ) //未稅金額小計
    var _taxtype_15_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_15']
    ) //未稅金額小計
    var _taxtype_25_amount = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_25']
    ) //未稅金額小計
    //未稅金額總計
    var _amount_taxtype_total = stringutility.convertToFloat(
      _taxTypeJsonObject['amount_taxtype_total']
    ) //未稅金額總計

    if (_amount_taxtype_total != 0) {
      //稅額為0不需計算
      var _taxtype_0_tax_amount = 0

      //稅額為1%
      var _tax_rate = 0.01
      _tax_amount +=
        _tax_rate *
        (_taxtype_1_amount -
          discountTotalAmount * (_taxtype_1_amount / _amount_taxtype_total))

      //稅額為2%
      _tax_rate = 0.02
      _tax_amount +=
        _tax_rate *
        (_taxtype_2_amount -
          discountTotalAmount * (_taxtype_2_amount / _amount_taxtype_total))

      //稅額為5%
      _tax_rate = 0.05
      _tax_amount +=
        _tax_rate *
        (_taxtype_5_amount -
          discountTotalAmount * (_taxtype_5_amount / _amount_taxtype_total))

      //稅額為15%
      _tax_rate = 0.15
      _tax_amount +=
        _tax_rate *
        (_taxtype_15_amount -
          discountTotalAmount * (_taxtype_15_amount / _amount_taxtype_total))

      //稅額為25%
      _tax_rate = 0.25
      _tax_amount +=
        _tax_rate *
        (_taxtype_25_amount -
          discountTotalAmount * (_taxtype_25_amount / _amount_taxtype_total))
    }
    return _tax_amount.toFixed(_numericToFixed)
  }

  function getSearchInvoiceFilters(selectedInvoiceIds) {
    var searchFilters = []
    searchFilters.push(['type', 'anyof', 'CustInvc'])
    searchFilters.push('AND')
    searchFilters.push(['taxline', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push(['cogs', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push(['shipping', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push(['status', 'noneof', 'CustInvc:V'])
    searchFilters.push('AND')
    searchFilters.push([
      [
        ['mainline', 'is', 'T']
      ],
      'OR',
      [
        ['mainline', 'is', 'F'],
        'AND',
        ['item', 'noneof', '@NONE@']
      ]
    ])

    if (selectedInvoiceIds !== null) {
      log.debug({title: 'getSearchInvoiceFilters - selectedInvoiceIds', details: selectedInvoiceIds})
      var invoiceIdArray = selectedInvoiceIds.split(',')
      log.debug({title: 'getSearchInvoiceFilters - invoiceIdArray', details: invoiceIdArray})
      searchFilters.push('AND')
      searchFilters.push(['internalid', 'anyof', invoiceIdArray])
    }
    return searchFilters;
  }

  function getSearchColumns() {
    var searchColumns = []
    gwTransactionFields.allSearchColumnFields.forEach(function (searchFieldId) {
      searchColumns.push(searchFieldId)
    })
    log.debug({title: 'getSearchColumns - searchColumns', details: searchColumns})
    return searchColumns;
  }

  function getSearchSetting() {
    var searchSetting = []
    searchSetting.push(
        search.createSetting({
          name: 'consolidationtype',
          value: 'NONE'
        })
    )
    return searchSetting;
  }

  function getInvoiceDetailsById(selectedInvoiceIds) {
    log.debug({title: 'getInvoiceDetailsById - start ...', details: ''});
    var searchFilters = getSearchInvoiceFilters(selectedInvoiceIds)
    var searchColumns = getSearchColumns()
    var searchSetting = getSearchSetting()
    var invoiceSearchObj = search.create({
      type: gwTransactionFields.recordId,
      filters: searchFilters,
      columns: searchColumns,
      settings: searchSetting
    });
    var searchResultCount = invoiceSearchObj.runPaged().count;
    log.debug({title: 'getInvoiceDetailsById - invoiceSearchObj result count', details: searchResultCount});
    var searchResultArray = []

    var searchObj = invoiceSearchObj.runPaged({
      pageSize: 1000
    });
    log.debug({title: 'getInvoiceDetailsById - searchObj', details: searchObj})

    searchObj.pageRanges.forEach(function (pageRange) {
      searchObj.fetch({index: pageRange.index}).data.forEach(function (result) {
        //Process each search result here
        log.debug({title: 'getInvoiceDetailsById - result', details: result})
        searchResultArray.push(JSON.parse(JSON.stringify(result)))
      });
    });

    log.debug({title: 'getInvoiceDetailsById - searchResultArray', details: searchResultArray})
    log.debug({title: 'getInvoiceDetailsById - end ...', details: ''});
    return searchResultArray
  }

  function getSearchCreditMemoFilters(selectedCreditMemoIds) {
    var searchFilters = []
    searchFilters.push(['type', 'anyof', 'CustCred'])
    searchFilters.push('AND')
    searchFilters.push(['taxline', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push(['cogs', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push(['shipping', 'is', 'F'])
    searchFilters.push('AND')
    searchFilters.push([
      [
        ['mainline', 'is', 'T']
      ],
      'OR',
      [
        ['mainline', 'is', 'F'],
        'AND',
        ['item', 'noneof', '@NONE@']
      ]
    ])

    if (selectedCreditMemoIds !== null) {
      log.debug({title: 'getSearchCreditMemoFilters - selectedCreditMemoIds', details: selectedCreditMemoIds})
      var creditMemoIdArray = selectedCreditMemoIds.split(',')
      log.debug({title: 'getSearchCreditMemoFilters - creditMemoIdArray', details: creditMemoIdArray})
      searchFilters.push('AND')
      searchFilters.push(['internalid', 'anyof', creditMemoIdArray])
    }
    return searchFilters;
  }

  function getCreditMemoDetailsById(selectedCreditMemoIds) {
    log.debug({title: 'getCreditMemoDetailsById - start ...', details: ''});
    var searchFilters = getSearchCreditMemoFilters(selectedCreditMemoIds)
    var searchColumns = getSearchColumns()
    var searchSetting = getSearchSetting()
    var creditMemoSearchObj = search.create({
      type: gwTransactionFields.recordId,
      filters: searchFilters,
      columns: searchColumns,
      settings: searchSetting
    });
    var searchResultCount = creditMemoSearchObj.runPaged().count;
    log.debug({title: 'getCreditMemoDetailsById - creditMemoSearchObj result count', details: searchResultCount});
    var searchResultArray = []

    var searchObj = creditMemoSearchObj.runPaged({
      pageSize: 1000
    });
    log.debug({title: 'getCreditMemoDetailsById - searchObj', details: searchObj})

    searchObj.pageRanges.forEach(function (pageRange) {
      searchObj.fetch({index: pageRange.index}).data.forEach(function (result) {
        //Process each search result here
        log.debug({title: 'getCreditMemoDetailsById - result', details: result})
        searchResultArray.push(JSON.parse(JSON.stringify(result)))
      });
    });

    log.debug({title: 'getCreditMemoDetailsById - searchResultArray', details: searchResultArray})
    log.debug({title: 'getCreditMemoDetailsById - end ...', details: ''});
    return searchResultArray
  }

  function composeResultObject(transactionSearchResultArray) {
    let resultArray = []
    transactionSearchResultArray.forEach(function (transactionSearchResultObject) {
      log.audit({title: 'composeResultObject - transactionSearchResultObject', details: transactionSearchResultObject})
      let optionObject = {};
      gwTransactionFields.allFieldIds.forEach(function (searchFieldId) {
        const searchColumnObject = gwTransactionFields.fields[searchFieldId]
        log.audit({title: 'composeResultObject - searchColumnObject', details: searchColumnObject})
        let attribute = searchColumnObject.name;
        if (searchColumnObject.join) attribute = `${searchColumnObject.join}.${attribute}`
        optionObject[searchColumnObject.outputField] =
            (attribute !== '' && transactionSearchResultObject.values[attribute])
                ? transactionSearchResultObject.values[attribute] : ''
      })
      optionObject.id = transactionSearchResultObject.id
      optionObject.recordType = transactionSearchResultObject.recordType
      log.audit({title: 'composeResultObject - optionObject', details: JSON.stringify(optionObject)})
      resultArray.push(optionObject)
    })
    log.audit({title: 'composeResultObject - resultArray', details: JSON.stringify(resultArray)})
    return resultArray
  }

  function createInvoiceSublistFields(sublist) {
    sublist.addField({
      id: 'customer_search_invoice_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_invoice_number',
      label: 'Invoice Number',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //放dept_code
    sublist.addField({
      id: 'customer_search_invoice_deptcode',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //放classfication
    sublist.addField({
      id: 'customer_search_invoice_class',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //Discount
    sublist.addField({
      id: 'customer_search_invoice_discount',
      label: 'Discount Item',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_invoice_seq',
      type: serverWidget.FieldType.TEXT,
      label: '順序'
    })
    sublist.addField({
      id: 'custpage_item_name',
      type: serverWidget.FieldType.TEXT,
      label: '名稱'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })
    sublist.addField({
      id: 'customer_search_invoice_tax_rate',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_invoice_tax_rate_note',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT
    })
    sublist.addField({
      id: 'customer_search_invoice_tax_code',
      label: '稅別',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_invoice_item_unit',
      type: serverWidget.FieldType.TEXT,
      label: '單位'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })
    sublist.addField({
      id: 'custpage_unit_price',
      type: serverWidget.FieldType.TEXT,
      label: '單價'
    })
    sublist.addField({
      id: 'custpage_item_quantity',
      type: serverWidget.FieldType.TEXT,
      label: '數量'
    })
    sublist.addField({
      id: 'custpage_item_amount',
      type: serverWidget.FieldType.TEXT,
      label: '小計(未稅)'
    })
    sublist.addField({
      id: 'custpage_item_remark',
      type: serverWidget.FieldType.TEXT,
      label: '明細備註'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })

    sublist.addField({
      id: 'custpage_item_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'Item Relate Number'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //20201105 walter modify
    sublist.addField({
      id: 'custpage_invoice_item_tax_amount',
      label: 'Item Tax Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_invoice_item_total_amount',
      label: 'Item Toatl Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_invoice_total_tax_amount',
      label: 'Total Tax Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_invoice_total_sum_amount',
      label: 'Sum Toatl Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
  }

  function createInvoiceDetails(form, invoiceDetailsArrayObject) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'invoicesublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS Invoice 商品清單'
    })
    //sublist.addMarkAllButtons();
    createInvoiceSublistFields(sublist)

    var _selectDepartment = ''
    var _selectClassification = ''

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

    //地址
    var _companyObj
    var _customer_ban = ''
    var _customer_email = ''
    var _company_name = ''
    var _company_address = ''

    //稅別資料
    var _taxObj
    var _hasZeroTax = false

    var _last_id = -1
    var _sales_order_id = -1
    var _sales_order_number = ''

    var _sales_order_id_ary = []
    var _invoice_sales_amount = 0
    var _invoice_free_sales_amount = 0
    var _invoice_zero_sales_amonut = 0

    ////////////////////////////////////////////////////////////
    //發票備註
    var _gw_gui_main_memo = ''
    //處理零稅率資訊
    //海關出口單類別
    var _gw_customs_export_category_value = ''
    var _gw_customs_export_category_text = ''
    //適用零稅率規定
    var _gw_applicable_zero_tax_value = ''
    var _gw_applicable_zero_tax_text = ''
    //海關出口號碼
    var _gw_customs_export_no_value = ''
    var _gw_customs_export_no_text = ''
    //通關註記
    var _gw_egui_clearance_mark_value = ''
    var _gw_egui_clearance_mark_text = ''
    //海關出口號碼
    var _gw_customs_export_no = ''
    //輸出或結匯日期
    var _gw_customs_export_date = ''
    ////////////////////////////////////////////////////////////
    //載具類別
    var _gw_gui_carrier_type = ''
    var _gw_gui_carrier_id_1 = ''
    var _gw_gui_carrier_id_2 = ''
    //捐贈代碼
    var _gw_gui_donation_code = ''
    ////////////////////////////////////////////////////////////

    invoiceDetailsArrayObject.forEach(function (result){
      log.debug({title: 'createInvoiceDetails - result', details: result})

      var _recordType = result.recordType //invoice
      var _id = result.id //948
      var _mainline = result.mainline
      log.debug('_mainline', '_mainline=' + _mainline)

      _last_id = _id

      log.debug('result', JSON.stringify(result))

      /////////////////////////////////////////////////////////////////////////////////////////////////
      //處理零稅率資訊
      if (result.custbody_gw_customs_export_category.length != 0) {
        //海關出口單類別
        _gw_customs_export_category_value =
          result.custbody_gw_customs_export_category[0].value //3
        _gw_customs_export_category_text =
          result.custbody_gw_customs_export_category[0].text //D1-課稅區售與或退回保稅倉
        var _temp_ary = _gw_customs_export_category_text.split('-')
        _gw_customs_export_category_text = _temp_ary[0]
      }
      if (result.custbody_gw_applicable_zero_tax.length != 0) {
        //適用零稅率規定
        _gw_applicable_zero_tax_value =
          result.custbody_gw_applicable_zero_tax[0].value //5
        _gw_applicable_zero_tax_text =
          result.custbody_gw_applicable_zero_tax[0].text //5-國際間之運輸
        var _temp_ary = _gw_applicable_zero_tax_text.split('-')
        _gw_applicable_zero_tax_text = _temp_ary[0]
      }
      if (result.custbody_gw_egui_clearance_mark.length != 0) {
        //通關註記
        _gw_egui_clearance_mark_value =
          result.custbody_gw_egui_clearance_mark[0].value //5
        _gw_egui_clearance_mark_text =
          result.custbody_gw_egui_clearance_mark[0].text //5-國際間之運輸
        var _temp_ary = _gw_egui_clearance_mark_text.split('-')
        _gw_egui_clearance_mark_text = _temp_ary[0]
      }
      //海關出口號碼 : AA123456789012
      _gw_customs_export_no = result.custbody_gw_customs_export_no
      //輸出或結匯日期 : 2021/01/22
      _gw_customs_export_date = convertExportDate(
        result.custbody_gw_customs_export_date
      )
      log.debug('_gw_customs_export_date', _gw_customs_export_date)
      /////////////////////////////////////////////////////////////////////////////////////////////////
      var _trandate = result.trandate
      var _dateStr = dateutility.getVoucherDateByDate(_trandate)
      if (
        stringutility.convertToFloat(_dateStr) >
        stringutility.convertToFloat(_index_date)
      ) {
        _index_date = _dateStr
        _index_trandate = _trandate
      }

      var _tranid = result.tranid //AZ10000019

      var _entityValue = 0 //529
      var _entityText = '' //11 se06_company公司
      if (result.entity.length != 0) {
        _entityValue = result.entity[0].value //529
        _entityText = result.entity[0].text //11 se06_company公司
      }

      //20211007 walter modify
      _gw_gui_main_memo = result.custbody_gw_gui_main_memo

      //Invoice統編
      _customer_ban = result.custbody_gw_tax_id_number //99999997
      if (stringutility.trim(_company_name) == '') {
        _company_name = result.custbody_gw_gui_title
        _company_address = result.custbody_gw_gui_address
      }
      //客戶Email
      _customer_email = result['customer.email']
      ///////////////////////////////////////////////////////////////////////
      //載具類別
      if (result.custbody_gw_gui_carrier_type.length != 0) {
        _gw_gui_carrier_type =
          result.custbody_gw_gui_carrier_type[0].value
      }
      _gw_gui_carrier_id_1 = result.custbody_gw_gui_carrier_id_1
      _gw_gui_carrier_id_2 = result.custbody_gw_gui_carrier_id_2
      //捐贈代碼
      _gw_gui_donation_code = result.custbody_gw_gui_donation_code

      ///////////////////////////////////////////////////////////////////////
      var _accountValue = '' //54
      var _accountText = '' //4000 Sales
      if (result.account.length != 0) {
        _accountValue = result.account[0].value //54
        _accountText = result.account[0].value //4000 Sales
      }
      //createdfrom 主檔才做
      if (_mainline == '*' && result.createdfrom.length != 0) {
        _sales_order_id = result.createdfrom[0].value //633
        _sales_order_id_ary.push(_sales_order_id)
        _sales_order_number = result.createdfrom[0].text //sales order  #42
      }

      var _amount = stringutility.convertToFloat(result.amount) //31428.57(未稅)
      //20210707 walter modify
      if (stringutility.convertToFloat(result.quantity) < 0)
        _amount = -1 * _amount

      //20201105 walter modify
      //NS 的總稅額
      var _ns_total_tax_amount = stringutility.convertToFloat(
        result.taxtotal
      ) //稅額總計 -5.00
      //NS 的總金額小計
      var _ns_total_sum_amount = stringutility.convertToFloat(
        result.total
      ) //金額總計(含稅)

      //NS 的稅額
      var _ns_item_tax_amount = stringutility.convertToFloat(
        result.taxamount
      ) //稅額總計 -5.00
      var _ns_item_total_amount =
          stringutility.convertToFloat(result.amount) + stringutility.convertToFloat(result.taxamount)
      if(result.item.length > 0 && stringutility.convertToFloat(result.quantity) < 0) {
        _ns_item_total_amount = Math.abs(stringutility.convertToFloat(result.amount)) + Math.abs(_ns_item_tax_amount)
      }

      var _linesequencenumber = result.linesequencenumber //1
      var _line = result.line //1
      var _itemtype = result.itemtype //InvtPart

      var _memo = result['memo']
      //var _item_salesdescription = result['item.salesdescription']
      var _prodcut_id = ''
      var _prodcut_text = ''
      if (result.item.length != 0) {
        _prodcut_id = result.item[0].value //10519
        _prodcut_text = result.item[0].text //NI20200811000099
      }
      log.debug('ns_item_name_field', _ns_item_name_field)
      var _item_displayname = result[_ns_item_name_field] //SONY電視機
      if (_ns_item_name_field == 'item.displayname') {
        _item_displayname = _prodcut_text + _item_displayname
      }
      //if (stringutility.trim(_memo) != '') _item_displayname = _memo

      var _item_taxItem_rate = result.taxRate //5.00%
      if (_item_taxItem_rate == '') {
        _item_taxItem_rate = '0'
      } else {
        //去除%符號
        _item_taxItem_rate = _item_taxItem_rate.replace('%', '')
      }
      _tax_rate = _item_taxItem_rate

      var _item_salestaxcodeValue = '' //10
      var _item_salestaxcodeText = '' //VAT-BIZ05

      // _item_salestaxcodeText = result['taxItem.itemid'] //VAT-BIZ05
      if (result.taxCode.length != 0) {
        _item_salestaxcodeValue = result.taxCode[0].value //10

        //抓稅別資料
        _taxObj = getTaxInformation(_item_salestaxcodeValue)
    
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

      var _rate = result.rate //單價3142.85714286
      var _department = ''
      if (result.department.length != 0) {
        _department = result.department[0].value
        _selectDepartment = _department + ''
      }
      var _class = ''
      if (result.class.length != 0) {
        _class = result.class[0].value
        _selectClassification = _class
      }
      var _quantity = result.quantity
      //20210909 walter 預設值設為1
      if (_quantity.trim().length == 0) _quantity = '1'
      if( parseFloat(_quantity) < 0 ) _quantity = -1 * _quantity

      //單位
      var _unitabbreviation = result.unitabbreviation
      if (_index_tranid != _tranid) {
        _index_tranid = _tranid
      }
      //明細備註
      var _item_memo = result.custcol_gw_item_memo

      if (_itemtype === 'Discount') {
        //20210908 walter modify => 折扣項目作進Item, 不另外處理
        //折扣項目
        //_sumDiscountAmount += stringutility.convertToFloat(_amount)
        //Discount 要再紀錄近來,不然會少
        //_sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
      }
      //主檔才做
      if (_recordType == 'invoice' && _mainline == '*') {
        var _ns_tax_total_amount = stringutility.convertToFloat(
          result.taxtotal
        ) //稅額總計 -5.00
        var _ns_total_amount = stringutility.convertToFloat(
          result.total
        ) //金額總計
        //grossamount
        _ns_SumTotalAmount += _ns_total_amount
        _ns_SumTaxAmount += _ns_tax_total_amount
      }

      //只放 Sales Items 進來 (Discount Item 要排除)
      if (
        _recordType == 'invoice' &&
        _mainline != '*'
        //20210908 walter modify => 折扣項目作進Item, 不另外處理
        //&&  _itemtype != 'Discount'
      ) {
        log.debug('get _taxObj', JSON.stringify(_taxObj))
        if (typeof _taxObj !== 'undefined') {
          if (_taxObj.voucher_property_value == '1') {
            _invoice_sales_amount += _amount
          } else if (_taxObj.voucher_property_value == '2') {
            _invoice_zero_sales_amonut += _amount
          } else if (_taxObj.voucher_property_value == '3') {
            _invoice_free_sales_amount += _amount
          }
        }
        //抓第1筆當部門
        if (_default_department_id.length == 0) {
          _default_department_id = _selectDepartment
        }
        _customer_id = _entityValue

        sublist.setSublistValue({
          id: 'customer_search_invoice_id',
          line: row,
          value: _id
        })
        sublist.setSublistValue({
          id: 'customer_search_invoice_number',
          line: row,
          value: stringutility.trimOrAppendBlank(_tranid)
        })
        sublist.setSublistValue({
          id: 'customer_search_invoice_seq',
          line: row,
          value: _linesequencenumber
        })
        sublist.setSublistValue({
          id: 'customer_search_invoice_deptcode',
          line: row,
          value: stringutility.trimOrAppendBlank(_department)
        })
        sublist.setSublistValue({
          id: 'customer_search_invoice_class',
          line: row,
          value: stringutility.trimOrAppendBlank(_class)
        })

        sublist.setSublistValue({
          id: 'custpage_invoice_item_unit',
          line: row,
          value: stringutility.trimOrAppendBlank(_unitabbreviation)
        })

        sublist.setSublistValue({
          id: 'customer_search_invoice_discount',
          line: row,
          value: stringutility.trimOrAppendBlank(_itemtype)
        })

        sublist.setSublistValue({
          id: 'customer_search_invoice_tax_code',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_salestaxcodeValue)
        })

        if (typeof _taxObj !== 'undefined') {
          var _tax_rate_note =
            _taxObj.voucher_property_note +
            ' - ' +
            Math.round(_item_taxItem_rate)
          sublist.setSublistValue({
            id: 'customer_search_invoice_tax_rate_note',
            line: row,
            value: stringutility.trimOrAppendBlank(_tax_rate_note)
          })
        }

        sublist.setSublistValue({
          id: 'customer_search_invoice_tax_rate',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_taxItem_rate)
        })

        sublist.setSublistValue({
          id: 'custpage_item_name',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_displayname)
        })

        sublist.setSublistValue({
          id: 'custpage_unit_price',
          line: row,
          value: stringutility.trimOrAppendBlank(_rate)
        })
        sublist.setSublistValue({
          id: 'custpage_item_quantity',
          line: row,
          value: stringutility.trimOrAppendBlank(_quantity)
        })
        sublist.setSublistValue({
          id: 'custpage_item_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_item_remark',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_memo)
        })

        sublist.setSublistValue({
          id: 'custpage_invoice_item_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_tax_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_invoice_item_total_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_total_amount)
        })
        
         //NE241 含稅金額
        _sum_item_total_amount += stringutility.convertToFloat(_ns_item_total_amount)

        sublist.setSublistValue({
          id: 'custpage_invoice_total_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_tax_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_invoice_total_sum_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_sum_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_item_relate_number',
          line: row,
          value: result.custcol_gw_item_relate_number || ' '
        })
        row++
        /////////////////////////////////////////////////////////////////////////////////////////
        //處理總計
        _sumSalesAmount += stringutility.convertToFloat(_amount)
        _sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
        _sumTotalAmount = _sumSalesAmount + _sumDiscountAmount + _sumTaxAmount
        /////////////////////////////////////////////////////////////////////////////////////////
      }

      return true
    })
    /////////////////////////////////////////////////////////////////////////////////////////
    //紀錄客戶押金-START
    log.debug('_sales_order_id_ary', JSON.stringify(_sales_order_id_ary))
    if (_sales_order_id_ary.length != 0) {
      var _sumJsonObj = accessCustomerDeposit(
        form,
        sublist,
        row,
        _selectDepartment,
        _selectClassification,
        _invoice_sales_amount,
        _invoice_free_sales_amount,
        _invoice_zero_sales_amonut,
        _sumSalesAmount,
        _sumTaxAmount,
        _sumTotalAmount,
        _ns_SumTotalAmount,
        _ns_SumTaxAmount,
        _sales_order_id_ary
      )
      if (typeof _sumJsonObj !== 'undefined') {
        _sumSalesAmount = _sumJsonObj.sumSalesAmount
        _sumTaxAmount = _sumJsonObj.sumTaxAmount
        _sumTotalAmount = _sumJsonObj.sumTotalAmount

        _ns_SumTaxAmount = _sumJsonObj.nsSumTaxAmount
        _ns_SumTotalAmount = _sumJsonObj.nsSumTotalAmount
      }
    }
    log.debug(
      'sumTotalAmount',
      'sumSalesAmount=' +
        _sumSalesAmount +
        ', sumTaxAmount=' +
        _sumTaxAmount +
        ' ,sumTotalAmount=' +
        _sumTotalAmount
    )
    log.debug(
      'NS sumTotalAmount',
      'sumSalesAmount=' +
        _sumSalesAmount +
        ', ns_SumTaxAmount=' +
        _ns_SumTaxAmount +
        ' ,ns_SumTotalAmount=' +
        _ns_SumTotalAmount
    )
    //紀錄客戶押金-END
    /////////////////////////////////////////////////////////////////////////////////////////
    var _select_voucher_date = form.getField({
      id: 'custpage_select_voucher_date'
    })
    _select_voucher_date.defaultValue = _index_trandate
    ////////////////////////////////////////////////////////////////////////////////////////
    //2. 處理Header的客戶資料
    //客戶代碼
    var _custpage_customer_id = form.getField({
      id: 'custpage_customer_id'
    })
    _custpage_customer_id.defaultValue = _customer_id

    var _dept_codeField = form.getField({
      id: 'custpage_dept_code'
    });
    (isEGUIDepartmentEnable) ? _dept_codeField.defaultValue = _default_department_id
        : _dept_codeField.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED})

    var _classificationField = form.getField({
      id: 'custpage_classification'
    });
    (isEGUIClassEnable) ? _classificationField.defaultValue = _selectClassification
        : _classificationField.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED})

    ////////////////////////////////////////////////////////////////////////////////////////
    //紀錄零稅率資料
    //適用零稅率規定
    var _applicable_zero_tax_field = form.getField({
      id: 'custpage_applicable_zero_tax'
    })
    _applicable_zero_tax_field.defaultValue = _gw_applicable_zero_tax_text
    //海關出口單類別
    var _customs_export_category_field = form.getField({
      id: 'custpage_gw_customs_export_category'
    })
    _customs_export_category_field.defaultValue = _gw_customs_export_category_text
    //海關出口號碼
    var _customs_export_no_field = form.getField({
      id: 'custpage_gw_customs_export_no'
    })
    _customs_export_no_field.defaultValue = _gw_customs_export_no
    //輸出或結匯日期
    var _customs_export_date_field = form.getField({
      id: 'custpage_gw_customs_export_date'
    })
    _customs_export_date_field.defaultValue = _gw_customs_export_date
    //通關註記
    var _customs_export_date_field = form.getField({
      id: 'custpage_customs_clearance_mark'
    })
    _customs_export_date_field.defaultValue = _gw_egui_clearance_mark_text

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
        id: 'custpage_buyer_identifier'
      })
      _custpage_buyer_identifier.defaultValue = _customer_ban

      var _custpage_buyer_name = form.getField({
        id: 'custpage_buyer_name'
      })
      _custpage_buyer_name.defaultValue = _company_name

      var _custpage_buyer_email = form.getField({
        id: 'custpage_buyer_email'
      })
      var _custpage_buyer_address = form.getField({
        id: 'custpage_buyer_address'
      })
      _custpage_buyer_address.defaultValue = _company_address
      /**
      if (typeof _companyObj !== 'undefined') {
        _custpage_buyer_email.defaultValue = _companyObj.email
      }
	  */
      _custpage_buyer_email.defaultValue = _customer_email

      //20211007 walter modify
      var _custpage_main_remark = form.getField({
        id: 'custpage_main_remark'
      })
      _custpage_main_remark.defaultValue = _gw_gui_main_memo
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    //控制通關註記選項
    if (_hasZeroTax == true) {
      var _custpage_customs_clearance_mark = form.getField({
        id: 'custpage_customs_clearance_mark'
      })
      _custpage_customs_clearance_mark.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL
      })
    }
    var _custpage_tax_type = form.getField({
      id: 'custpage_tax_type'
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
      id: 'custpage_sales_amount'
    })
    _sales_amount_field.defaultValue = _sumSalesAmount.toFixed(_numericToFixed)

    var _sales_discount_amount = form.getField({
      id: 'custpage_sales_discount_amount'
    })
    _sales_discount_amount.defaultValue = _sumDiscountAmount.toFixed(
      _numericToFixed
    )

    //3. 重新計算稅額
    var _tax_amount_field = form.getField({
      id: 'custpage_tax_amount'
    })
    _tax_amount_field.defaultValue = _ns_SumTaxAmount

    var _toatl_amount_field = form.getField({
      id: 'custpage_total_amount'
    })
    _toatl_amount_field.defaultValue = _ns_SumTotalAmount.toFixed(
      _numericToFixed
    )

    //NE-241 小計含稅總金額
    var _sum_item_total_amount_field = form.getField({
      id: 'custpage_sum_item_total_amount'
    })
    _sum_item_total_amount_field.defaultValue = _sum_item_total_amount.toFixed(
      _numericToFixed
    )

    //處理總計計部分-START
    /////////////////////////////////////////////////////////////////////////////////////////
    //載具類別
    var _gw_gui_carrier_type_field = form.getField({
      id: 'custpage_carrier_type'
    })
    _gw_gui_carrier_type_field.defaultValue = _gw_gui_carrier_type
    var _gw_gui_carrier_id_1_field = form.getField({
      id: 'custpage_carrier_id_1'
    })
    _gw_gui_carrier_id_1_field.defaultValue = _gw_gui_carrier_id_1
    var _gw_gui_carrier_id_w_field = form.getField({
      id: 'custpage_carrier_id_2'
    })
    _gw_gui_carrier_id_w_field.defaultValue = _gw_gui_carrier_id_2
    //捐贈代碼
    var _gw_gui_donation_code_field = form.getField({ id: 'custpage_npo_ban' })
    _gw_gui_donation_code_field.defaultValue = _gw_gui_donation_code
  }

  //處理客戶押金
  function accessCustomerDeposit(
    form,
    sublist,
    row,
    dept_code,
    classfication,
    invoice_sales_amount,
    invoice_free_sales_amount,
    invoice_zero_sales_amonut,
    sumSalesAmount,
    sumTaxAmount,
    sumTotalAmount,
    _ns_SumTotalAmount,
    _ns_SumTaxAmount,
    sales_order_id_ary
  ) {
    var _sumJsonObj
    var _deductedAmountObjAry = []

    try {
      var _jsonObjAry = invoiceutility.getCustomerDepositBalanceAmount(
        sales_order_id_ary
      )
      log.debug('accessCustomerDeposit jsonObjAry', JSON.stringify(_jsonObjAry))
      if (typeof _jsonObjAry !== 'undefined') {
        var _seq_no = row + 1

        for (var i = 0; i < _jsonObjAry.length; i++) {
          var _jsonObj = _jsonObjAry[i]

          var _assign_document_id = _jsonObj.assign_document_id //sales_order_id
          var _sales_order_number = _jsonObj.assign_document_number
          var _tax_type = _jsonObj.tax_type
          var _tax_amount = _jsonObj.tax_amount
          var _amount = -1 * _jsonObj.amount
          var _total_amount = _jsonObj.total_amount
          var _dedcuted_amount = _jsonObj.dedcuted_amount //已扣金額
          /////////////////////////////////////////////////////////////////////////////////
          var _ns_tax_code_obj = getTaxInformationByTaxId(_tax_type)
          var _ns_tax_code = _ns_tax_code_obj.netsuite_id_value
          log.debug('accessCustomerDeposit _ns_tax_code', JSON.stringify(_ns_tax_code))
          var _tax_rate = 5
          var _tax_rate_note = '應稅'

          //紀錄可扣餘額
          var _balance_amount = _amount + _dedcuted_amount
          var _deduction_amount = _balance_amount

          if (_tax_type == '2') {
            _tax_rate = 0
            _tax_rate_note = '零稅'
            if (invoice_zero_sales_amonut < Math.abs(_balance_amount)) {
              _deduction_amount = -1 * invoice_zero_sales_amonut
            }
            invoice_zero_sales_amonut += _deduction_amount
          } else if (_tax_type == '3') {
            _tax_rate = 0
            _tax_rate_note = '免稅'
            if (invoice_free_sales_amount < Math.abs(_balance_amount)) {
              _deduction_amount = -1 * invoice_free_sales_amount
            }
            invoice_free_sales_amount += _deduction_amount
          } else {
            //應稅
            if (invoice_sales_amount < Math.abs(_balance_amount)) {
              _deduction_amount = -1 * invoice_sales_amount
            }
            invoice_sales_amount += _deduction_amount
          }
          _tax_rate_note += ' - ' + _tax_rate
          //金額為0不處理
          if (_deduction_amount == 0) continue

          //紀錄可扣餘額
          var _deductedAmountObj = {
            assign_document_id: _assign_document_id,
            tax_type: _tax_type,
            dedcuted_amount: Math.abs(_deduction_amount)
          }
          _deductedAmountObjAry.push(_deductedAmountObj)

          //處理Sublist
          sublist.setSublistValue({
            id: 'customer_search_invoice_id',
            line: row,
            value: _assign_document_id
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_number',
            line: row,
            value: stringutility.trimOrAppendBlank(_sales_order_number)
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_seq',
            line: row,
            value: _seq_no
          })

          sublist.setSublistValue({
            id: 'customer_search_invoice_deptcode',
            line: row,
            value: stringutility.trimOrAppendBlank(dept_code)
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_class',
            line: row,
            value: stringutility.trimOrAppendBlank(classfication)
          })
          sublist.setSublistValue({
            id: 'custpage_invoice_item_unit',
            line: row,
            value: '筆'
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_discount',
            line: row,
            value: stringutility.trimOrAppendBlank('SALES_ORDER')
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_tax_code',
            line: row,
            value: stringutility.trimOrAppendBlank(_ns_tax_code)
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_tax_rate_note',
            line: row,
            value: _tax_rate_note
          })
          sublist.setSublistValue({
            id: 'customer_search_invoice_tax_rate',
            line: row,
            value: _tax_rate
          })
          sublist.setSublistValue({
            id: 'custpage_item_name',
            line: row,
            value: _customer_deposit_text
          })
          //放未稅金額
          //NE-338
          //NE-355 客戶押金項目的單價欄位改為負數
          sublist.setSublistValue({
            id: 'custpage_unit_price',
            line: row,
            value: _deduction_amount
          })
          /**
          sublist.setSublistValue({
            id: 'custpage_unit_price',
            line: row,
            value: Math.abs(_deduction_amount)
          })
          */
          sublist.setSublistValue({
            id: 'custpage_item_quantity',
            line: row,
            value: '1'
          })
          sublist.setSublistValue({
            id: 'custpage_item_amount',
            line: row,
            value: _deduction_amount
          })
          sublist.setSublistValue({
            id: 'custpage_item_remark',
            line: row,
            value: stringutility.trimOrAppendBlank('')
          })

          //計算稅及金額合計
          var _deduction_tax_amount = (_deduction_amount * _tax_rate) / 100
          sublist.setSublistValue({
            id: 'custpage_invoice_item_tax_amount',
            line: row,
            value: _deduction_tax_amount
          })
          sublist.setSublistValue({
            id: 'custpage_invoice_item_total_amount',
            line: row,
            value: _deduction_amount + _deduction_tax_amount
          })
          //NE241 含稅金額
          _sum_item_total_amount += _deduction_amount + _deduction_tax_amount

          sublist.setSublistValue({
            id: 'custpage_invoice_total_tax_amount',
            line: row,
            value: _deduction_tax_amount
          })
          sublist.setSublistValue({
            id: 'custpage_invoice_total_sum_amount',
            line: row,
            value: _deduction_amount + _deduction_tax_amount
          })

          sumSalesAmount += _deduction_amount
          sumTaxAmount += _deduction_tax_amount
          sumTotalAmount += _deduction_amount + _deduction_tax_amount

          _ns_SumTaxAmount += _deduction_tax_amount
          _ns_SumTotalAmount += _deduction_amount + _deduction_tax_amount
          /////////////////////////////////////////////////////////////////////////////////
        }
        _sumJsonObj = {
          sumSalesAmount: sumSalesAmount,
          sumTaxAmount: sumTaxAmount,
          sumTotalAmount: sumTotalAmount,
          nsSumTaxAmount: _ns_SumTaxAmount,
          nsSumTotalAmount: _ns_SumTotalAmount
        }

        //將物件轉成String 放入 Hiddent Element
        if (
          typeof _deductedAmountObjAry !== 'undefined' &&
          _deductedAmountObjAry.length != 0
        ) {
          log.debug(
            'Log DeductedAmountObjAry',
            JSON.stringify(_deductedAmountObjAry)
          )
          var _deposit_voucher_hiddent_listid = form.getField({
            id: 'custpage_deposit_voucher_hiddent_listid'
          })
          _deposit_voucher_hiddent_listid.defaultValue = JSON.stringify(
            _deductedAmountObjAry
          )
        }
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _sumJsonObj
  }

  function createCreditMemoSublistFields(sublist) {
    sublist.addField({
      id: 'customer_search_creditmemo_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_creditmemo_number',
      label: 'Credit Memo Number',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //放dept_code
    sublist.addField({
      id: 'customer_search_creditmemo_deptcode',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //放classfication
    sublist.addField({
      id: 'customer_search_creditmemo_class',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    //Discount
    sublist.addField({
      id: 'customer_search_creditmemo_discount',
      label: 'Discount Item',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_creditmemo_seq',
      type: serverWidget.FieldType.TEXT,
      label: '順序'
    })
    sublist.addField({
      id: 'custpage_item_name',
      type: serverWidget.FieldType.TEXT,
      label: '名稱'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })
    sublist.addField({
      id: 'customer_search_creditmemo_tax_rate',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'customer_search_creditmemo_tax_rate_note',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT
    })
    sublist.addField({
      id: 'customer_search_creditmemo_tax_code',
      label: '稅別',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_creditmemo_item_unit',
      type: serverWidget.FieldType.TEXT,
      label: '單位'
    })
    sublist.addField({
      id: 'custpage_unit_price',
      type: serverWidget.FieldType.TEXT,
      label: '單價'
    })
    sublist.addField({
      id: 'custpage_item_quantity',
      type: serverWidget.FieldType.TEXT,
      label: '數量'
    })
    sublist.addField({
      id: 'custpage_item_amount',
      type: serverWidget.FieldType.TEXT,
      label: '小計(未稅)'
    })
    var _itemRemarkField = sublist.addField({
      id: 'custpage_item_remark',
      type: serverWidget.FieldType.TEXT,
      label: '明細備註'
    })
    _itemRemarkField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })

    sublist.addField({
      id: 'custpage_item_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'Item Relate Number'
    }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY
    })
    ////////////////////////////////////////////////////////////////////////////////////////
    //20201105 walter modify
    sublist.addField({
      id: 'custpage_creditmemo_item_tax_amount',
      label: 'Item Tax Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_creditmemo_item_total_amount',
      label: 'Item Toatl Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })

    sublist.addField({
      id: 'custpage_creditmemo_total_tax_amount',
      label: 'Item Tax Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
    sublist.addField({
      id: 'custpage_creditmemo_total_sum_amount',
      label: 'Item Toatl Amount',
      type: serverWidget.FieldType.TEXT
    }).updateDisplayType({
      displayType: fieldHiddenControl
    })
  }

  function createCreditMemoDetails(form, creditMemoDetailsArrayObject) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'creditmemosublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS Credit Memo 商品清單'
    })
    //sublist.addMarkAllButtons();
    var _gw_gui_num_start_field= form.getField({
      id: 'custbody_gw_gui_num_start'
    })
    createCreditMemoSublistFields(sublist)

    //1.處理 CreditMemo Detail Items
    var _selectDepartment = ''
    var _selectClassification = ''

    var row = 0
    //客戶代碼
    var _customer_id = 0
    //稅率
    var _tax_rate = 0
    var _ns_tax_type_code = '-1'
    var _index_date = '0'
    var _index_trandate

    //公司地址
    var _companyObj
    var _customer_ban = ''
    var _customer_email = ''
    var _company_name = ''
    var _company_address = ''

    //稅別資料
    var _taxObj
    var _hasZeroTax = false

    ////////////////////////////////////////////////////////////
    //處理零稅率資訊
    //海關出口單類別
    var _gw_customs_export_category_value = ''
    var _gw_customs_export_category_text = ''
    //適用零稅率規定
    var _gw_applicable_zero_tax_value = ''
    var _gw_applicable_zero_tax_text = ''
    //海關出口號碼
    var _gw_customs_export_no_value = ''
    var _gw_customs_export_no_text = ''

    //通關註記
    var _gw_egui_clearance_mark_value = ''
    var _gw_egui_clearance_mark_text = ''
    //海關出口號碼
    var _gw_customs_export_no = ''
    //輸出或結匯日期
    var _gw_customs_export_date = ''
    //扣抵發票號碼
    var _gw_custpage_deduction_egui_number = ''
    ////////////////////////////////////////////////////////////

    //var _nsSalesAccountValue = getNSInvoiceAccount('CREDITMEMO_ACCOUNT', 'CREDITMEMO_DETAIL_ACCOUNT');

    creditMemoDetailsArrayObject.forEach(function (result) {
      log.debug({title: 'createCreditMemoDetails - result', details: result})

      var _recordType = result.recordType //creditmemo
      var _id = result.id //948
      var _mainline = result.mainline
      log.debug('_mainline', '_mainline=' + _mainline)
      log.debug('credit memo result', JSON.stringify(result))

      /////////////////////////////////////////////////////////////////////////////////////////////////
      //處理零稅率資訊
      if (result.custbody_gw_customs_export_category.length != 0) {
        //海關出口單類別
        _gw_customs_export_category_value =
            result.custbody_gw_customs_export_category[0].value //3
        var _customs_export_category_record = record.load({
          type: 'customrecord_gw_customs_export_category',
          id: parseInt(_gw_customs_export_category_value, 10),
          isDynamic: true
        })
        _gw_customs_export_category_text = _customs_export_category_record.getValue(
          { fieldId: 'custrecord_gw_customers_export_cate_id' }
        )
      }
      if (result.custbody_gw_applicable_zero_tax.length != 0) {
        //適用零稅率規定
        _gw_applicable_zero_tax_value =
            result.custbody_gw_applicable_zero_tax[0].value //5
        var _ap_doc_exempt_option_record = record.load({
          type: 'customrecord_gw_ap_doc_exempt_option',
          id: parseInt(_gw_applicable_zero_tax_value, 10),
          isDynamic: true
        })
        _gw_applicable_zero_tax_text = _ap_doc_exempt_option_record.getValue({
          fieldId: 'custrecord_gw_ap_doc_exempt_value'
        })
      }
      if (result.custbody_gw_egui_clearance_mark.length != 0) {
        //通關註記
        _gw_egui_clearance_mark_value =
            result.custbody_gw_egui_clearance_mark[0].value //5
        var _ap_doc_custom_option_record = record.load({
          type: 'customrecord_gw_ap_doc_custom_option',
          id: parseInt(_gw_egui_clearance_mark_value, 10),
          isDynamic: true
        })
        _gw_egui_clearance_mark_text = _ap_doc_custom_option_record.getValue({
          fieldId: 'custrecord_gw_ap_doc_custom_value'
        })
      }
      //海關出口號碼 : AA123456789012
      _gw_customs_export_no = result.custbody_gw_customs_export_no
      //輸出或結匯日期 : 2021/01/22
      _gw_customs_export_date = convertExportDate(
          result.custbody_gw_customs_export_date
      )
      log.debug('_gw_customs_export_date', _gw_customs_export_date)
      /////////////////////////////////////////////////////////////////////////////////////////////////

      var _trandate = result.trandate
      var _dateStr = dateutility.getVoucherDateByDate(_trandate)
      if (
        stringutility.convertToFloat(_dateStr) >
        stringutility.convertToFloat(_index_date)
      ) {
        _index_date = _dateStr
        _index_trandate = _trandate
      }
      var _tranid = result.tranid //AZ10000019

      var _entityValue = '' //529
      var _entityText = '' //11 se06_company公司
      if (result.entity.length != 0) {
        _entityValue = result.entity[0].value //529
        _entityText = result.entity[0].text //11 se06_company公司
      }

      //Invoice統編
      _customer_ban = result.custbody_gw_tax_id_number //99999997
      if (stringutility.trim(_company_name) == '') {
        _company_name = result.custbody_gw_gui_title
        _company_address = result.custbody_gw_gui_address
        //公司名稱
        //_companyObj = getCustomerRecord(_customer_ban)
        if (typeof _companyObj !== 'undefined') {
          //_entityValue     = stringutility.convertToInt(_companyObj.internalid);
        }
      }
      //客戶Email
      _customer_email = result['customer.email']

      var _accountValue = '' //54
      var _accountText = '' //4000 Sales
      if (result.account.length != 0) {
        _accountValue = result.account[0].value //54
        _accountText = result.account[0].value //4000 Sales
      }
      var _amount = stringutility.convertToFloat(result.amount) //31428.57(未稅)
      //20201105 walter modify
      //NS 的總稅額
      var _ns_total_tax_amount = stringutility.convertToFloat(
        result.taxtotal
      ) //稅額總計 -5.00
      //NS 的總金額小計
      var _ns_total_sum_amount = stringutility.convertToFloat(
        result.total
      ) //金額總計(含稅)
      //NS 的稅額
      var _ns_item_tax_amount = stringutility.convertToFloat(
        result.taxamount
      ) //稅額總計 -5.00
      var _ns_item_total_amount =
          stringutility.convertToFloat(result.amount) + stringutility.convertToFloat(result.taxamount)
      var _linesequencenumber = result.linesequencenumber //1
      var _line = result.line //1
      var _itemtype = result.itemtype //InvtPart

      var _memo = result['memo'] //雅結~~
      //var _item_salesdescription = result['item.salesdescription']
      var _prodcut_id = ''
      var _prodcut_text = ''
      if (result.item.length != 0) {
        _prodcut_id = result.item[0].value //10519
        _prodcut_text = result.item[0].text //NI20200811000099
      }
      log.debug('ns_item_name_field', _ns_item_name_field)
      var _item_displayname = result[_ns_item_name_field] //SONY電視機
      if (_ns_item_name_field == 'item.displayname') {
        _item_displayname = _prodcut_text + _item_displayname
      }
      //if (stringutility.trim(_memo) != '') _item_displayname = _memo

      var _item_taxItem_rate = result.taxRate //5.00%
      if (_item_taxItem_rate == '') {
        _item_taxItem_rate = '0'
      } else {
        //去除%符號
        _item_taxItem_rate = _item_taxItem_rate.replace('%', '')
      }
      _tax_rate = _item_taxItem_rate

      var _item_salestaxcodeValue = '' //10
      // var _item_salestaxcodeText = result['taxItem.itemid'] //VAT-BIZ05

      if (result.taxCode.length != 0) {
        _item_salestaxcodeValue = result.taxCode[0].value //10
        //_item_salestaxcodeText  = result['taxItem.internalid'][0].text;   //VAT-BIZ05
        _taxObj = getTaxInformation(_item_salestaxcodeValue)
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
      /////////////////////////////////////////////////////////////////////////////////
      var _rate = result.fxrate //3047.61904762

      var _department = ''
      if (result.department.length != 0) {
        _department = result.department[0].value
        _selectDepartment = _department + ''
      }
      var _class = ''
      if (result.class.length != 0) {
        _class = result.class[0].value
        _selectClassification = _class
      }

      var _quantity = result.quantity
      //20210909 walter 預設值設為1
      if (_quantity.trim().length == 0) _quantity = '1'
      //單位
      var _unitabbreviation = result.unitabbreviation

      if (_itemtype === 'Discount') {
        //20210908 walter modify => 折扣項目作進Item, 不另外處理
        //折扣項目
        //_sumDiscountAmount += stringutility.convertToFloat(_amount)
        //_sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
      }
      //主檔才做
      if (_recordType == 'creditmemo' && _mainline == '*') {
        var _ns_tax_total_amount = stringutility.convertToFloat(
          result.taxtotal
        ) //稅額總計 -5.00
        var _ns_total_amount = stringutility.convertToFloat(
          result.total
        ) //金額總計
        //grossamount
        _ns_SumTotalAmount += _ns_total_amount
        _ns_SumTaxAmount += _ns_tax_total_amount
      }

      //只放Sales進來
      if (
        _recordType === 'creditmemo' &&
        _mainline != '*'
        //20210908 walter modify => 折扣項目作進Item, 不另外處理
        // &&  _itemtype != 'Discount'
      ) {
    	  
        _gw_gui_num_start_field.defaultValue = result.custbody_gw_gui_num_start
    	  
        //抓第1筆當部門
        if (_default_department_id.length == 0) {
          _default_department_id = _selectDepartment
        }

        _customer_id = _entityValue

        sublist.setSublistValue({
          id: 'customer_search_creditmemo_id',
          line: row,
          value: _id
        })
        sublist.setSublistValue({
          id: 'customer_search_creditmemo_number',
          line: row,
          value: _tranid
        })
        sublist.setSublistValue({
          id: 'customer_search_creditmemo_seq',
          line: row,
          value: _linesequencenumber
        })
        sublist.setSublistValue({
          id: 'customer_search_creditmemo_deptcode',
          line: row,
          value: stringutility.trimOrAppendBlank(_department)
        })

        sublist.setSublistValue({
          id: 'custpage_creditmemo_item_unit',
          line: row,
          value: stringutility.trimOrAppendBlank(_unitabbreviation)
        })

        sublist.setSublistValue({
          id: 'customer_search_creditmemo_class',
          line: row,
          value: stringutility.trimOrAppendBlank(_class)
        })
        sublist.setSublistValue({
          id: 'customer_search_creditmemo_discount',
          line: row,
          value: stringutility.trimOrAppendBlank(_itemtype)
        })

        if (typeof _taxObj !== 'undefined') {
          var _tax_rate_note =
            _taxObj.voucher_property_note +
            ' - ' +
            Math.round(_item_taxItem_rate)
          sublist.setSublistValue({
            id: 'customer_search_creditmemo_tax_rate_note',
            line: row,
            value: stringutility.trimOrAppendBlank(_tax_rate_note)
          })
        }

        sublist.setSublistValue({
          id: 'customer_search_creditmemo_tax_code',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_salestaxcodeValue)
        })
        sublist.setSublistValue({
          id: 'customer_search_creditmemo_tax_rate',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_taxItem_rate)
        })

        sublist.setSublistValue({
          id: 'custpage_item_name',
          line: row,
          value: stringutility.trimOrAppendBlank(_item_displayname)
        })

        sublist.setSublistValue({
          id: 'custpage_unit_price',
          line: row,
          value: stringutility.trimOrAppendBlank(_rate)
        })
        sublist.setSublistValue({
          id: 'custpage_item_quantity',
          line: row,
          value: stringutility.trimOrAppendBlank(_quantity)
        })
        sublist.setSublistValue({
          id: 'custpage_item_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_amount)
        })

        sublist.setSublistValue({
          id: 'custpage_creditmemo_item_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_tax_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_creditmemo_item_total_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_item_total_amount)
        })
        //NE241 含稅金額
        _sum_item_total_amount += stringutility.convertToFloat(_ns_item_total_amount)

        sublist.setSublistValue({
          id: 'custpage_creditmemo_total_tax_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_tax_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_creditmemo_total_sum_amount',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_total_sum_amount)
        })
        sublist.setSublistValue({
          id: 'custpage_item_relate_number',
          line: row,
          value: result.custcol_gw_item_relate_number || ' '
        })
        row++

        _sumSalesAmount += stringutility.convertToFloat(_amount)
        _sumTaxAmount += stringutility.convertToFloat(_ns_item_tax_amount)
        _sumTotalAmount = _sumSalesAmount + _sumDiscountAmount + _sumTaxAmount
      }

      return true
    })
    var _select_voucher_date = form.getField({
      id: 'custpage_select_voucher_date'
    })
    _select_voucher_date.defaultValue = _index_trandate
    ////////////////////////////////////////////////////////////////////////////////////////
    //2. 處理Header的客戶資料
    if (_hasZeroTax == true) {
      var _custpage_customs_clearance_mark = form.getField({
        id: 'custpage_customs_clearance_mark'
      })
      _custpage_customs_clearance_mark.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL
      })
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    //紀錄零稅率資料
    //適用零稅率規定
    var _applicable_zero_tax_field = form.getField({
      id: 'custpage_applicable_zero_tax'
    })
    _applicable_zero_tax_field.defaultValue = _gw_applicable_zero_tax_text
    //海關出口單類別
    var _customs_export_category_field = form.getField({
      id: 'custpage_gw_customs_export_category'
    })
    _customs_export_category_field.defaultValue = _gw_customs_export_category_text
    //海關出口號碼
    var _customs_export_no_field = form.getField({
      id: 'custpage_gw_customs_export_no'
    })
    _customs_export_no_field.defaultValue = _gw_customs_export_no
    //輸出或結匯日期
    var _customs_export_date_field = form.getField({
      id: 'custpage_gw_customs_export_date'
    })
    _customs_export_date_field.defaultValue = _gw_customs_export_date
    //通關註記
    var _customs_export_date_field = form.getField({
      id: 'custpage_customs_clearance_mark'
    })
    _customs_export_date_field.defaultValue = _gw_egui_clearance_mark_text

    ////////////////////////////////////////////////////////////////////////////////////////
    //客戶代碼
    var _custpage_customer_id = form.getField({
      id: 'custpage_customer_id'
    })
    //_custpage_customer_id.defaultValue = _customer_id.toString()
    _custpage_customer_id.defaultValue = _customer_id

    var _dept_codeField = form.getField({
      id: 'custpage_dept_code'
    });
    (isEGUIDepartmentEnable) ? _dept_codeField.defaultValue = _default_department_id
        : _dept_codeField.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED})
    var _classificationField = form.getField({
      id: 'custpage_classification'
    });
    (isEGUIClassEnable) ? _classificationField.defaultValue = _selectClassification
        : _classificationField.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED})

    log.debug(
      '_customer_id',
      '_customer_id=' +
        _customer_id +
        ', _customer_ban=' +
        _customer_ban +
        ' ,_company_name=' +
        _company_name
    )

    if (_customer_id > 0) {
      var _custpage_buyer_identifier = form.getField({
        id: 'custpage_buyer_identifier'
      })
      _custpage_buyer_identifier.defaultValue = _customer_ban

      var _custpage_buyer_name = form.getField({
        id: 'custpage_buyer_name'
      })
      _custpage_buyer_name.defaultValue = _company_name

      var _custpage_buyer_email = form.getField({
        id: 'custpage_buyer_email'
      })
      /**
      if (typeof _companyObj !== 'undefined') {
        _custpage_buyer_email.defaultValue = _companyObj.email
      }
	  */
      _custpage_buyer_email.defaultValue = _customer_email

      var _custpage_buyer_address = form.getField({
        id: 'custpage_buyer_address'
      })
      _custpage_buyer_address.defaultValue = _company_address
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    var _custpage_tax_type = form.getField({
      id: 'custpage_tax_type'
    })
    _custpage_tax_type.defaultValue = _ns_tax_type_code
        
    //20231214
    var _custpage_tax_rate = form.getField({
        id: 'custpage_tax_rate'
    })      
    if (_ns_tax_type_code=='1' || _ns_tax_type_code=='9'){
    	_custpage_tax_rate.defaultValue = '5'
    } else {
    	_custpage_tax_rate.defaultValue = '0'
    } 
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    var _sales_amount_field = form.getField({
      id: 'custpage_sales_amount'
    })
    _sales_amount_field.defaultValue = _sumSalesAmount.toFixed(_numericToFixed)
    var _sales_discount_amount = form.getField({
      id: 'custpage_sales_discount_amount'
    })
    _sales_discount_amount.defaultValue = _sumDiscountAmount.toFixed(
      _numericToFixed
    )

    //3. 重新計算稅額
    //_sumTaxAmount = recaculateTaxContainDiscountItem(Math.abs(_sumDiscountAmount));
    var _tax_amount_field = form.getField({
      id: 'custpage_tax_amount'
    })
    _tax_amount_field.defaultValue = _ns_SumTaxAmount

    var _toatl_amount_field = form.getField({
      id: 'custpage_total_amount'
    })
    _toatl_amount_field.defaultValue = _ns_SumTotalAmount.toFixed(
      _numericToFixed
    )
    
    
    //NE-241 小計含稅總金額
    var _sum_item_total_amount_field = form.getField({
      id: 'custpage_sum_item_total_amount'
    })
    _sum_item_total_amount_field.defaultValue = _sum_item_total_amount.toFixed(
      _numericToFixed
    )

    //扣抵發票號碼

    var _custpage_allowance_deduction_period = form.getField({
      id:'custpage_allowance_deduction_period'
    })
    var _custpage_deduction_egui_number = form.getField({
      id:'custpage_deduction_egui_number'
    })

    if (!(form.getSublist({id:'invoicesublistid'}))){
      //if (form.getSublist({id:'invoicesublistid'}) !== null){
      var groupBy = function(xs, key) {
        return xs.reduce(function(rv, x) {
          (rv[x[key]] = rv[x[key]] || []).push(x);
          return rv;
        }, {});
      };
      var groupByGuiNum = Object.keys(groupBy(creditMemoDetailsArrayObject, 'custbody_gw_gui_num_start'))

      if (groupByGuiNum.length === 1 && groupByGuiNum[0] !== '' ){
        var _selectDeductionPeriod = form.getField({
          id:'custpage_allowance_deduction_period'
        })

        _selectDeductionPeriod.defaultValue = 'user_selected'
        _custpage_deduction_egui_number.defaultValue = groupByGuiNum[0]

      }
    }

    /////////////////////////////////////////////////////////////////////////////////////////
  }

  function getEGUIConfig() {

  }

  function onRequest(context) {
    //取得開立統編
    var _selected_business_no = context.request.parameters.custpage_businessno
    log.debug(
      '_selected_business_no',
      '_selected_business_no=' + _selected_business_no
    )
    var _selected_invoice_Id = context.request.parameters.invoice_hiddent_listid
    var _selected_creditmemo_Id =
      context.request.parameters.creditmemo_hiddent_listid
    log.debug(
      'parameters',
      ' selected_business_no:' +
        _selected_business_no +
        ' ,selected_invoice_Id:' +
        _selected_invoice_Id +
        ' ,selected_creditmemo_Id=' +
        _selected_creditmemo_Id
    )
    ///////////////////////////////////////////////////////////////////////////////////////////
    //載入稅別資料
    _taxObjAry = loadAllTaxInformation()
    ///////////////////////////////////////////////////////////////////////////////////////////
    //處理資料

    ///////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-START
    ///////////////////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '電子發票開立作業（憑證開立）'
    })
    //Hiddent Element
    var _hiddenfield = form.addField({
      id: 'custpage_invoice_hiddent_buttontype',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN'
    })
    _hiddenfield.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //紀錄可扣餘額
    var _hidden_deposit_voucher_field = form.addField({
      id: 'custpage_deposit_voucher_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN'
    })
    _hidden_deposit_voucher_field.updateDisplayType({
      displayType: fieldHiddenControl
    })
    //////////////////////////////////////////////////////////////////////////////////////////
    //發票List
    var _hiddeninvoicelistld = form.addField({
      id: 'custpage_invoice_hiddent_listid',
      type: serverWidget.FieldType.TEXTAREA,
      label: 'HIDDEN'
    })
    _hiddeninvoicelistld.updateDisplayType({
      displayType: fieldHiddenControl
    })
    _hiddeninvoicelistld.defaultValue = _selected_invoice_Id
    //折讓單List
    var _hiddencreditmemolistld = form.addField({
      id: 'custpage_creditmemo_hiddent_listid',
      type: serverWidget.FieldType.TEXTAREA,
      label: 'HIDDEN'
    })
    _hiddencreditmemolistld.updateDisplayType({
      displayType: fieldHiddenControl
    })
    _hiddencreditmemolistld.defaultValue = _selected_creditmemo_Id
    //////////////////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////////////////////
    createFormHeader(_selected_business_no, form, context)

    var eGUIConfig = gwDaoEguiConfig.getSetting()
    log.debug({
      title: 'onRequest - eGUIConfig',
      details: eGUIConfig
    })
    isEGUIClassEnable = eGUIConfig.isEGUIClass
    isEGUIDepartmentEnable = eGUIConfig.isEGUIDepartment

    if (_selected_invoice_Id != null) {
      var _idAry = _selected_invoice_Id.split(',')
      if (_idAry.length > 1) {
        const invoiceSearchResultArray = getInvoiceDetailsById(_selected_invoice_Id)
        const invoiceDetailsArrayObject = composeResultObject(invoiceSearchResultArray)
        log.debug({title: 'invoiceDetailsArrayObject', details: invoiceDetailsArrayObject})
        createInvoiceDetails(form, invoiceDetailsArrayObject)
      }
    }
    if (_selected_creditmemo_Id != null) {
      var _idAry = _selected_creditmemo_Id.split(',')
      if (_idAry.length > 1) {
        const creditMemoSearchResultArray = getCreditMemoDetailsById(_selected_creditmemo_Id)
        const creditMemoDetailsArrayObject = composeResultObject(creditMemoSearchResultArray)
        log.debug({title: 'creditMemoDetailsArrayObject', details: creditMemoDetailsArrayObject})
        createCreditMemoDetails(form, creditMemoDetailsArrayObject)
      }
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
        '")'
    })
    form.addButton({
      id: 'custpage_forward_back_button',
      label: '回前一頁',
      functionName: 'backToPage()'
    })

    ////////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-END
    ///////////////////////////////////////////////////////////////////////////////////////////

    //form.clientScriptModulePath = './gw_invoice_ui_event_v2.js'
    form.clientScriptModulePath = './gw_invoice_ui_event.js'
    context.response.writePage(form)
  } //End onRequest

  return {
    onRequest: onRequest
  }
})
