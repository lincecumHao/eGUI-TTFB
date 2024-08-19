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
  'N/url',
  'N/file',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_search_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_syncegui_to_document_utility',
  '../../gw_dao/carrierType/gw_dao_carrier_type_21',
], function (
  config,
  serverWidget,
  record,
  search,
  url,
  file,
  invoiceutility,
  dateutility,
  stringutility,
  searchutility,
  gwconfigure,
  synceguidocument,
  carriertypedao
) {
  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  //憑證 Information View
  var _voucher_view_script_id = 'customscript_gw_allowance_ui_view'
  var _voucher_view_deploy_id = 'customdeploy_gw_allowance_ui_view'

  var _gw_mig_a0101_xml_path = gwconfigure.getGwMigA0101XmlPath()
  var _gw_mig_a0401_xml_path = gwconfigure.getGwMigA0401XmlPath()
  var _gw_mig_c0401_xml_path = gwconfigure.getGwMigC0401XmlPath()
  var _gw_mig_b0101_xml_path = gwconfigure.getGwMigB0101XmlPath()
  var _gw_mig_b0401_xml_path = gwconfigure.getGwMigB0401XmlPath()
  var _gw_mig_d0401_xml_path = gwconfigure.getGwMigD0401XmlPath() //C0401的折讓單
  var _version = gwconfigure.getGwMigVersion() //GateWeb API Version

  ///////////////////////////////////////////////////////////////////////////////////////////
  //處理重傳
  function reApplyTaskButton(
    form,
    voucher_internal_id,
    voucher_upload_status,
    voucher_status
  ) {
    //只有錯誤才做
    if (
      voucher_upload_status == 'E' &&
      voucher_status.indexOf('VOUCHER') != -1
    ) {
      form.addButton({
        id: 'custpage_voucher_reapply_button',
        label: '發票開立-重傳',
        functionName: 'reApplyVoucherTask(' + voucher_internal_id + ')',
      })
    }
  }

  //顯示畫面
  function createFormHeader(form, _voucher_internal_id) {
    /////////////////////////////////////////////////////////////
    //load company information
    var _companyInfo = config.load({
      type: config.Type.COMPANY_INFORMATION,
    })
    var _taxid = _companyInfo.getValue({
      fieldId: 'taxid',
    })
    var _companyname = _companyInfo.getValue({
      fieldId: 'companyname',
    })
    var _mainaddress_text = _companyInfo.getValue({
      fieldId: 'mainaddress_text',
    })
    //暫借欄位做統編
    var _ban = _companyInfo.getValue({
      fieldId: 'employerid',
    })
    var _legalname = _companyInfo.getValue({
      fieldId: 'legalname',
    })
    /////////////////////////////////////////////////////////////
    //1.Load Record
    var _voucher_record = record.load({
      type: 'customrecord_gw_voucher_main',
      id: _voucher_internal_id,
      isDynamic: true,
    })
    /////////////////////////////////////////////////////////////
    //C or E
    var _voucher_upload_status = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_upload_status',
    })
    var _gw_carrier_type = _voucher_record.getValue({
      fieldId: 'custrecord_gw_carrier_type',
    })
    var _npo_ban = _voucher_record.getValue({ fieldId: 'custrecord_gw_npoban' })

    var _is_printed_pdf = _voucher_record.getValue({
      fieldId: 'custrecord_gw_is_printed_pdf',
    })
    
    var _is_gw_voucher_format_35_code = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_format_code',
    })
    
    if (
      _is_printed_pdf == true ||
      _is_gw_voucher_format_35_code != '35' ||
      stringutility.trim(_gw_carrier_type) != '' ||
      stringutility.trim(_npo_ban) != ''
    ) {
      var _print_pdf_button = form.getButton({
        id: 'custpage_print_pdf_button',
      })
      _print_pdf_button.isDisabled = true
    }
    var _is_printed_paper = _voucher_record.getValue({
      fieldId: 'custrecord_gw_is_printed_paper',
    })
    if (
      _is_printed_paper == true ||
      stringutility.trim(_gw_carrier_type) != '' ||
      stringutility.trim(_npo_ban) != ''
    ) {
      var _print_paper_button = form.getButton({
        id: 'custpage_print_document_button',
      })
      _print_paper_button.isDisabled = true
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////
    var _row01_fieldgroupid = form.addFieldGroup({
      id: 'row01_fieldgroupid',
      label: '憑證資訊',
    })
    //憑證類型=>EGUI or ALLOWANCE
    var _voucher_type_field = form.addField({
      id: 'custpage_voucher_type',
      type: serverWidget.FieldType.TEXT,
      label: '憑證類型',
      container: 'row01_fieldgroupid',
    })
    _voucher_type_field.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_type',
    })
    _voucher_type_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //發票號碼
    var _voucher_number_field = form.addField({
      id: 'custpage_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '發票號碼',
      container: 'row01_fieldgroupid',
    })
    _voucher_number_field.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_number',
    })
    _voucher_number_field.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    })
    _voucher_number_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //發票日期
    var _voucher_date_field = form.addField({
      id: 'custpage_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: '發票日期',
      container: 'row01_fieldgroupid',
    })
    _voucher_date_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    _voucher_date_field.defaultValue = _voucher_record
      .getValue({ fieldId: 'custrecord_gw_voucher_date' })
      .toString()
    //發票時間
    var _voucher_time_field = form.addField({
      id: 'custpage_voucher_time',
      type: serverWidget.FieldType.TEXT,
      label: '發票時間',
      container: 'row01_fieldgroupid',
    })
    _voucher_time_field.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_time',
    })
    _voucher_time_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //單據狀態 [VOUCHER_SUCCESS]
    var _voucher_status = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_status',
    })
    var _voucher_status_desc = invoiceutility.getVoucherStatusDesc(
      _voucher_status
    )
    //開立狀態 [C/E]
    var _voucher_upload_status = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_upload_status',
    })
    var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(_voucher_upload_status)
    //NE-338
    var _gw_need_upload_egui_mig = _voucher_record.getValue({
      fieldId: 'custrecord_gw_need_upload_egui_mig',
    })
    
    if (_voucher_upload_status=='C' && _gw_need_upload_egui_mig=='NONE' && _is_gw_voucher_format_35_code =='35'){
    	_voucher_upload_status_desc = invoiceutility.getUploadStatusDesc('EU')
    }else if (_is_gw_voucher_format_35_code !='35'){
    	_voucher_upload_status_desc = invoiceutility.getUploadStatusDesc('M')
    }

    //處理重傳
    reApplyTaskButton(
      form,
      _voucher_internal_id,
      _voucher_upload_status,
      _voucher_status
    )

    //憑證狀態 = {VOUCHER_SUCCESS, CANCEL_SUCCESS}
    var _gw_voucher_status_field = form.addField({
      id: 'custpage_gw_voucher_status',
      type: serverWidget.FieldType.TEXT,
      label: '憑證狀態',
      container: 'row01_fieldgroupid',
    })
    _gw_voucher_status_field.defaultValue = _voucher_status
    _gw_voucher_status_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _voucher_upload_status_field = form.addField({
      id: 'custpage_voucher_upload_status',
      type: serverWidget.FieldType.TEXT,
      label: '開立狀態',
      container: 'row01_fieldgroupid',
    })
    _voucher_upload_status_field.defaultValue =
      _voucher_status_desc + ':' + _voucher_upload_status_desc
    _voucher_upload_status_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //公司統編
    var _company_ban = form.addField({
      id: 'custpage_company_ban',
      type: serverWidget.FieldType.TEXT,
      label: '公司統編',
      container: 'row01_fieldgroupid',
    })
    _company_ban.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_seller',
    })
    _company_ban.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //公司名稱
    var _company_name = form.addField({
      id: 'custpage_company_name',
      type: serverWidget.FieldType.TEXT,
      label: '公司名稱',
      container: 'row01_fieldgroupid',
    })
    _company_name.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_seller_name',
    })
    _company_name.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })

    //客戶名稱
    var _customer_id = form.addField({
      id: 'custpage_customer_id',
      type: serverWidget.FieldType.SELECT,
      label: '客戶代碼',
      source: 'CUSTOMER',
      container: 'row01_fieldgroupid',
    }) 
 
    _customer_id.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    _customer_id.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    _customer_id.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_original_buyer_id',
    })

    //公司統編
    var _buyer_identifier = form.addField({
      id: 'custpage_buyer_identifier',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司統編',
      container: 'row01_fieldgroupid',
    })
    _buyer_identifier.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_buyer',
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
    _buyer_name.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_buyer_name',
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
    _buyer_email.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_buyer_email',
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
    _customs_buyer_address.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_buyer_address',
    })
    _customs_buyer_address.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //發票備註
    var _main_remark = form.addField({
      id: 'custpage_main_remark',
      type: serverWidget.FieldType.TEXTAREA,
      label: '發票備註',
      container: 'row01_fieldgroupid',
    })
    _main_remark.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_main_remark',
    })
    _main_remark.updateDisplayType({
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
    _carrier_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    /////////////////////////////////////////////////////////////////////////////////////////
    //20210913 walter add
    var _all_carry_types = carriertypedao.getAll()
	log.debug('get _all_carry_types', JSON.stringify(_all_carry_types))
	for (var i=0; i<_all_carry_types.length; i++) {
		 var _carry_json_obj = _all_carry_types[i]
		 var _carry_text = _carry_json_obj.text
		 var _carry_value = _carry_json_obj.value
		 
		 _carrier_type.addSelectOption({
		      value: _carry_value,
		      text: _carry_text,
	     }) 
	} 
    ///////////////////////////////////////////////////////////////////////////////////////// 
    _carrier_type.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    _carrier_type.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_carrier_type',
    })

    //載具號碼
    var _carrier_id_1 = form.addField({
      id: 'custpage_carrier_id_1',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-1',
      container: 'row01_fieldgroupid',
    })
    _carrier_id_1.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_carrierid1',
    })
    _carrier_id_1.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    var _carrier_id_2 = form.addField({
      id: 'custpage_carrier_id_2',
      type: serverWidget.FieldType.TEXT,
      label: '載具號碼-2',
      container: 'row01_fieldgroupid',
    })
    _carrier_id_2.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_carrierid2',
    })
    _carrier_id_2.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //捐贈碼
    var _npo_ban_field = form.addField({
      id: 'custpage_npo_ban',
      type: serverWidget.FieldType.TEXT,
      label: '捐贈碼',
      container: 'row01_fieldgroupid',
    })
    _npo_ban_field.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_npoban',
    })
    _npo_ban_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
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
    _customs_clearance_mark.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_clearance_mark',
    })
    if (_voucher_record.getValue({fieldId: 'custrecord_gw_clearance_mark'})=='') {
    	_customs_clearance_mark.updateDisplayType({
    	     displayType: serverWidget.FieldDisplayType.HIDDEN,
    	})
    }
    //發票類型
    var _invoice_type = form.addField({
      id: 'custpage_invoice_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票類型',
      container: 'row01_fieldgroupid',
    })
    _invoice_type.addSelectOption({
      value: '07',
      text: '一般稅發票',
    })
    _invoice_type.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_invoice_type',
    })
    _invoice_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
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
    _mig_type.addSelectOption({
      value: 'Exchange',
      text: '交換',
    })
    _mig_type.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_mig_type',
    })
    _mig_type.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })

    //發票類別
    var _invoice_open_type_field = form.addField({
      id: 'custpage_invoice_open_type',
      type: serverWidget.FieldType.SELECT,
      label: '發票類別',
      container: 'row01_fieldgroupid',
    })
    _invoice_open_type_field.addSelectOption({
      value: 'EGUI',
      text: '電子發票',
    })
    _invoice_open_type_field.addSelectOption({
      value: 'UN_UPLOAD_EGUI',
      text: '不上傳發票',
    })
    _invoice_open_type_field.addSelectOption({
      value: 'MANUAL_EGUI',
      text: '歷史發票',
    })
    var _invoice_open_type = 'EGUI'
    var _need_upload_egui_mig = _voucher_record.getValue({
      fieldId: 'custrecord_gw_need_upload_egui_mig',
    })
    var _is_manual_voucher = _voucher_record.getValue({
      fieldId: 'custrecord_gw_is_manual_voucher',
    })

    if (_is_manual_voucher == true) _invoice_open_type = 'MANUAL_EGUI'
    else if (_need_upload_egui_mig == 'NONE')
      _invoice_open_type = 'UN_UPLOAD_EGUI'

    _invoice_open_type_field.defaultValue = _invoice_open_type
    _invoice_open_type_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })

    ////////////////////////////////////////////////////////////////////////////////////////
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
    _tax_type.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    _tax_type.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_tax_type',
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
    //未稅銷售額
    var _sales_amount = form.addField({
      id: 'custpage_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '銷售額',
      container: 'row01_fieldgroupid',
    })
    var _total_sales_amount =
      _voucher_record.getValue({ fieldId: 'custrecord_gw_sales_amount' }) +
      _voucher_record.getValue({ fieldId: 'custrecord_gw_free_sales_amount' }) +
      _voucher_record.getValue({ fieldId: 'custrecord_gw_zero_sales_amount' })
    _sales_amount.defaultValue = _total_sales_amount
    _sales_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //總稅額
    var _tax_amount = form.addField({
      id: 'custpage_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅額',
      container: 'row01_fieldgroupid',
    })
    _tax_amount.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_tax_amount',
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
    _total_amount.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_total_amount',
    })
    _total_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    //可折餘額
    var _total_balance_amount = form.addField({
      id: 'custpage_total_balance_amount',
      type: serverWidget.FieldType.TEXT,
      label: '可折餘額(未稅)',
      container: 'row01_fieldgroupid',
    })
    _total_balance_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    var _balance_amount =
      _total_sales_amount -
      _voucher_record.getValue({ fieldId: 'custrecord_gw_discount_amount' })
    _total_balance_amount.defaultValue = _balance_amount

    //可折稅額
    var _balance_tax_amount =
      _voucher_record.getValue({ fieldId: 'custrecord_gw_tax_amount' }) -
      _voucher_record.getValue({
        fieldId: 'custrecord_gw_discount_sales_amount',
      }) *
        0.05
    //var _balance_tax_amount = ((_voucher_record.getValue({fieldId: 'custrecord_gw_sales_amount'})-_voucher_record.getValue({fieldId: 'custrecord_gw_discount_sales_amount'}))*0.05);
    var _total_balance_tax_amount = form.addField({
      id: 'custpage_total_balance_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '可折稅額',
      container: 'row01_fieldgroupid',
    })
    _total_balance_tax_amount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    _total_balance_tax_amount.defaultValue = _balance_tax_amount
    ///////////////////////////////////////////////////////////////////////////////////
    
    return _voucher_record
  } //End Function

  //發票明細
  function searchEGUIDetails(form, _selected_voucher_internal_id) {
	var _document_list_ary = []
    //處理Detail
    var sublist = form.addSublist({
      id: 'invoicesublistid',
      type: serverWidget.SublistType.LIST,
      label: '商品-清單',
    })
    var _itemInterhalIdField = sublist.addField({
      id: 'customer_search_internal_id',
      type: serverWidget.FieldType.TEXT,
      label: 'Item Internal ID',
    })
    _itemInterhalIdField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    sublist.addField({
      id: 'customer_search_invoice_seq',
      type: serverWidget.FieldType.TEXT,
      label: '順序',
    })
    sublist.addField({
      id: 'custpage_item_name',
      type: serverWidget.FieldType.TEXT,
      label: '名稱',
    })
    sublist.addField({
      id: 'customer_search_invoice_tax_rate_note',
      label: '稅率%',
      type: serverWidget.FieldType.TEXT,
    })
    sublist.addField({
      id: 'custpage_invoice_item_unit',
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
    sublist.addField({
      id: 'custpage_item_remark',
      type: serverWidget.FieldType.TEXT,
      label: '明細備註',
    })
    sublist.addField({
      id: 'custpage_item_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'Item Relate Number',
    })

    //1.處理 Voucher Detail Items
    var _selectDepartment = ''
    var _selectClassification = ''
    var _mySearch = search.create({
      type: 'customrecord_gw_voucher_details',
      columns: [
        search.createColumn({
          name: 'custrecord_gw_item_seq',
          sort: search.Sort.ASC,
        }),
        search.createColumn({ name: 'custrecord_gw_item_description' }),
        search.createColumn({ name: 'custrecord_gw_item_unit' }),
        search.createColumn({ name: 'custrecord_gw_unit_price' }),
        search.createColumn({ name: 'custrecord_gw_item_quantity' }),
        search.createColumn({ name: 'custrecord_gw_item_amount' }),
        search.createColumn({ name: 'custrecord_gw_item_remark' }),
        search.createColumn({ name: 'custrecord_gw_dtl_item_tax_rate' }),
        search.createColumn({ name: 'custrecord_gw_ns_document_type' }),
        search.createColumn({ name: 'custrecord_gw_ns_document_apply_id' }),
        search.createColumn({ name: 'custrecord_gw_dtl_item_relate_number' })
      ],
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_voucher_main_internal_id',
      'is',
      _selected_voucher_internal_id,
    ])
    ////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    log.debug('_filterArray', JSON.stringify(_filterArray))
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('result', JSON.stringify(result))

      var _item_seq = _result.values.custrecord_gw_item_seq
      var _item_description = _result.values.custrecord_gw_item_description
      var _item_unit = _result.values.custrecord_gw_item_unit
      var _unit_price = _result.values.custrecord_gw_unit_price
      var _item_quantity = _result.values.custrecord_gw_item_quantity
      var _item_amount = _result.values.custrecord_gw_item_amount
      var _item_remark = _result.values.custrecord_gw_item_remark
      var _item_tax_rate = _result.values.custrecord_gw_dtl_item_tax_rate
      
      //////////////////////////////////////////////////////////////////////////////////////////
      var _ns_document_type = _result.values.custrecord_gw_ns_document_type       
      var _ns_document_apply_id = -1
      if (_result.values.custrecord_gw_ns_document_apply_id.length != 0) {
    	  _ns_document_apply_id = _result.values.custrecord_gw_ns_document_apply_id[0].value 
      }
      
      var _ns_document_type_id = _ns_document_type+'_'+_ns_document_apply_id
      if (_document_list_ary.toString().indexOf(_ns_document_type_id) ==-1) {
          _document_list_ary.push(_ns_document_type_id) 
      }
      //////////////////////////////////////////////////////////////////////////////////////////
      //NE-355
      if (_item_amount<0)_unit_price=-1*_unit_price
      
      sublist.setSublistValue({
        id: 'customer_search_internal_id',
        line: row,
        value: _result.id,
      })
      sublist.setSublistValue({
        id: 'customer_search_invoice_seq',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_seq),
      })

      sublist.setSublistValue({
        id: 'custpage_item_name',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_description),
      })
      sublist.setSublistValue({
        id: 'custpage_invoice_item_unit',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_unit),
      })
      sublist.setSublistValue({
        id: 'custpage_unit_price',
        line: row,
        value: stringutility.trimOrAppendBlank(_unit_price),
      })
      sublist.setSublistValue({
        id: 'custpage_item_quantity',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_quantity),
      })
      sublist.setSublistValue({
        id: 'customer_search_invoice_tax_rate_note',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_tax_rate),
      })
      sublist.setSublistValue({
        id: 'custpage_item_amount',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_amount),
      })
      sublist.setSublistValue({
        id: 'custpage_item_remark',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_remark),
      })
      sublist.setSublistValue({
        id: 'custpage_item_relate_number',
        line: row,
        value: stringutility.trimOrAppendBlank(_result.values['custrecord_gw_dtl_item_relate_number']),
      })

      row++

      return true
    })
    ///////////////////////////////////////////////////////////////////////////////////////// 
    return _document_list_ary
  }

  //折讓單明細
  function searchAllowanceDetails(form, _selected_voucher_internal_id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'allowancesublistid',
      type: serverWidget.SublistType.LIST,
      label: '折讓(電子發票)-清單',
    })
    var _viewField = sublist.addField({
      id: 'custpage_allowance_view',
      type: serverWidget.FieldType.URL,
      label: '檢視-折讓(電子發票)',
    })
    _viewField.linkText = '檢視-折讓(電子發票)'
    var _numberField = sublist.addField({
      id: 'custpage_allowance_number',
      type: serverWidget.FieldType.TEXT,
      label: '折讓單號碼',
    })
    var _dateField = sublist.addField({
      id: 'custpage_allowance_date',
      label: '折讓單日期',
      type: serverWidget.FieldType.TEXT,
    })
    sublist.addField({
      id: 'custpage_allowance_status',
      type: serverWidget.FieldType.TEXT,
      label: '折讓單狀態',
    })

    //1.處理 Voucher Detail Items
    var _mySearch = search.create({
      type: 'customrecord_gw_voucher_details',
      columns: [
        search.createColumn({ name: 'custrecord_gw_dtl_voucher_number' }),
        search.createColumn({ name: 'custrecord_gw_dtl_voucher_date' }),
        search.createColumn({ name: 'custrecord_gw_dtl_voucher_time' }),
        search.createColumn({ name: 'custrecord_gw_voucher_main_internal_id' }),
        search.createColumn({ name: 'custrecord_gw_dtl_voucher_status' }),
        search.createColumn({
          name: 'custrecord_gw_dtl_voucher_upload_status',
        }),
      ],
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_original_gui_internal_id',
      search.Operator.IS,
      _selected_voucher_internal_id,
    ])
    _filterArray.push('or')
    _filterArray.push([
      'custrecord_gw_original_gui_internal_id',
      search.Operator.IS,
      _selected_voucher_internal_id + '.0',
    ])
    ////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    log.debug(
      'searchAllowanceDetails filterArray',
      JSON.stringify(_filterArray)
    )
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    var _index_dtl_voucher_number = ''
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('searchAllowanceDetails result', JSON.stringify(result))

      var _dtl_voucher_number = _result.values.custrecord_gw_dtl_voucher_number
      var _dtl_voucher_date = _result.values.custrecord_gw_dtl_voucher_date
      var _dtl_voucher_time = _result.values.custrecord_gw_dtl_voucher_time
      var _voucher_main_internal_id =
        _result.values.custrecord_gw_voucher_main_internal_id
      var _dtl_voucher_status = _result.values.custrecord_gw_dtl_voucher_status
      var _dtl_voucher_upload_status =
        _result.values.custrecord_gw_dtl_voucher_upload_status

      if (_index_dtl_voucher_number.indexOf(_dtl_voucher_number) == -1) {
        _index_dtl_voucher_number += _dtl_voucher_number

        sublist.setSublistValue({
          id: 'custpage_allowance_number',
          line: row,
          value: stringutility.trimOrAppendBlank(_dtl_voucher_number),
        })

        sublist.setSublistValue({
          id: 'custpage_allowance_date',
          line: row,
          value: stringutility.trimOrAppendBlank(_dtl_voucher_date),
        })

        var _check_internal_id = ''
        var _status_desc = ''
        if (_result.values.custrecord_gw_voucher_main_internal_id.length != 0) {
          _check_internal_id =
            _result.values.custrecord_gw_voucher_main_internal_id[0].value
          _status_desc = getAllowanceStatus(_check_internal_id)
        }
        sublist.setSublistValue({
          id: 'custpage_allowance_status',
          line: row,
          value: stringutility.trimOrAppendBlank(_status_desc),
        })
        ///////////////////////////////////////////////////////////////////////
        var _params = {
          voucher_type: 'ALLOWANCE',
          voucher_internal_id: _check_internal_id,
        }
        var _url_value = url.resolveScript({
          scriptId: _voucher_view_script_id,
          deploymentId: _voucher_view_deploy_id,
          params: _params,
        })
        sublist.setSublistValue({
          id: 'custpage_allowance_view',
          line: row,
          value: _url_value,
        })

        row++
      }
      return true
    })
    /////////////////////////////////////////////////////////////////////////////////////////
  }

  //上傳紀錄
  function searchUploadLogDetails(form, _selected_voucher_internal_id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'uploadlogsublistid',
      type: serverWidget.SublistType.LIST,
      label: '上傳記錄-清單',
    })
    sublist.addField({
      id: 'custpage_upload_date',
      type: serverWidget.FieldType.TEXT,
      label: '上傳日期',
    })
    sublist.addField({
      id: 'custpage_upload_status',
      label: '狀態',
      type: serverWidget.FieldType.TEXT,
    })
    sublist.addField({
      id: 'custpage_upload_message',
      label: '錯誤訊息',
      type: serverWidget.FieldType.TEXT,
    })
    var _xmlField = sublist.addField({
      id: 'custpage_upload_xml',
      label: '上傳XML',
      type: serverWidget.FieldType.TEXTAREA,
    })
    _xmlField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })

    //1.處理 Voucher Detail Items
    var _mySearch = search.create({
      type: 'customrecord_gw_xml_upload_log',
      columns: [
        search.createColumn({ name: 'custrecord_gw_upload_voucher_date' }),
        search.createColumn({ name: 'custrecord_gw_upload_voucher_time' }),
        search.createColumn({ name: 'custrecord_gw_upload_voucher_migtype' }),
        search.createColumn({ name: 'custrecord_gw_upload_voucher_xml' }),
        search.createColumn({ name: 'custrecord_gw_upload_response_status' }),
        search.createColumn({ name: 'custrecord_gw_upload_response_message' }),
        search.createColumn({ name: 'custrecord_gw_download_voucher_status' }),
        search.createColumn({ name: 'custrecord_gw_download_voucher_message' })
      ],
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_upload_voucher_apply_id',
      search.Operator.EQUALTO,
      _selected_voucher_internal_id,
    ])
    ////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    log.debug(
      'searchUploadLogDetails filterArray',
      JSON.stringify(_filterArray)
    )
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('searchUploadLogDetails result', JSON.stringify(result))
   
      var _upload_voucher_date =
        _result.values.custrecord_gw_upload_voucher_date
      var _upload_voucher_time =
        _result.values.custrecord_gw_upload_voucher_time
      var _upload_voucher_migtype =
        _result.values.custrecord_gw_upload_voucher_migtype
      var _upload_voucher_xml = _result.values.custrecord_gw_upload_voucher_xml
      var _download_voucher_status =
        _result.values.custrecord_gw_download_voucher_status
      var _download_voucher_message =
        _result.values.custrecord_gw_download_voucher_message
      //上傳結果
      var _upload_response_status =
        _result.values.custrecord_gw_upload_response_status
      var _upload_response_message =
        _result.values.custrecord_gw_upload_response_message

      sublist.setSublistValue({
        id: 'custpage_upload_date',
        line: row,
        value: stringutility.trimOrAppendBlank(
          _upload_voucher_date + ' ' + _upload_voucher_time
        ),
      })

      var _upload_voucher_migtype_desc = ''
      if (
        _upload_voucher_migtype == 'A0101' ||
        _upload_voucher_migtype == 'A0401' ||
        _upload_voucher_migtype == 'C0401'
      ) {
        _upload_voucher_migtype_desc = '開立'
      } else {
        _upload_voucher_migtype_desc = '作廢'
      }

      var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(
        _download_voucher_status
      )

      if (stringutility.trim(_download_voucher_status) == '')
        _voucher_upload_status_desc = '上傳中'
      sublist.setSublistValue({
        id: 'custpage_upload_status',
        line: row,
        value: stringutility.trimOrAppendBlank(
          _upload_voucher_migtype_desc + ':' + _voucher_upload_status_desc
        ),
      })

      var _voucher_error_message = _download_voucher_message
      if (
        stringutility.convertToFloat(_upload_response_status) < 200 ||
        stringutility.convertToFloat(_upload_response_status) > 299
      ) {
        _voucher_error_message = _upload_response_message
      }
      _voucher_error_message = _voucher_error_message.substring(0, 300)

      sublist.setSublistValue({
        id: 'custpage_upload_message',
        line: row,
        value: stringutility.trimOrAppendBlank(_voucher_error_message),
      })

      sublist.setSublistValue({
        id: 'custpage_upload_xml',
        line: row,
        value: _upload_voucher_xml.substring(0, 4000),
      })

      row++
      return true
    })

    /////////////////////////////////////////////////////////////////////////////////////////
  }

  //NS-Document明細
  function searchNetsuiteDocumentList(form, _selected_voucher_internal_id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'nsdocumentsublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS文件-清單',
    })
    var _view_xml_field = sublist.addField({
      id: 'custpage_document_view',
      type: serverWidget.FieldType.URL,
      label: '檢視',
    })
    _view_xml_field.linkText = '檢視-NS文件'
    sublist.addField({
      id: 'custpage_document_type',
      type: serverWidget.FieldType.TEXT,
      label: '文件類別',
    })
    sublist.addField({
      id: 'custpage_document_number',
      label: '文件編號',
      type: serverWidget.FieldType.TEXT,
    })

    //1.處理 Voucher Detail Items
    var _mySearch = search.create({
      type: 'customrecord_gw_voucher_details',
      columns: [
        search.createColumn({ name: 'custrecord_gw_ns_document_type' }),
        search.createColumn({
          name: 'custrecord_gw_ns_document_apply_id',
          sort: search.Sort.ASC,
        }),
        search.createColumn({ name: 'custrecord_gw_ns_document_number' }),
      ],
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_voucher_main_internal_id',
      'is',
      _selected_voucher_internal_id,
    ])
    ////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    log.debug('_filterArray', JSON.stringify(_filterArray))
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    var _index_ns_document_number = ''
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('searchNetsuiteDocumentList result', JSON.stringify(result))

      var _ns_document_type = _result.values.custrecord_gw_ns_document_type
      //20210514 walter modify _ns_document_apply_id 
      var _ns_document_apply_id = -1;
      if (_result.values.custrecord_gw_ns_document_apply_id.length != 0) {
    	  _ns_document_apply_id = _result.values.custrecord_gw_ns_document_apply_id[0].value //529           
      }
      
      var _ns_document_number = _result.values.custrecord_gw_ns_document_number
      ///////////////////////////////////////////////////////////////////
      if (_index_ns_document_number.indexOf(_ns_document_number) == -1) {
        _index_ns_document_number += _ns_document_number
        var _record_type = _ns_document_type.replace('_', '')

        var _url_value = url.resolveRecord({
          recordType: _record_type,
          recordId: parseInt(_ns_document_apply_id),
          isEditMode: false,
        })
        sublist.setSublistValue({
          id: 'custpage_document_view',
          line: row,
          value: _url_value,
        })
        ///////////////////////////////////////////////////////////////////
        sublist.setSublistValue({
          id: 'custpage_document_type',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_document_type),
        })
        sublist.setSublistValue({
          id: 'custpage_document_number',
          line: row,
          value: stringutility.trimOrAppendBlank(_ns_document_number),
        })
        row++
      }
      return true
    })
    /////////////////////////////////////////////////////////////////////////////////////////
  }

  //讀取單據狀態
  function getAllowanceStatus(internal_id) {
    //1.處理 狀態
    var _record = record.load({
      type: 'customrecord_gw_voucher_main',
      id: parseInt(internal_id),
      isDynamic: true,
    })
    //VOUCHER_SUCCESS
    var _voucher_status = _record.getValue({
      fieldId: 'custrecord_gw_voucher_status',
    })
    var _voucher_status_desc = invoiceutility.getVoucherStatusDesc(
      _voucher_status
    )
    //C or E
    var _voucher_upload_status = _record.getValue({
      fieldId: 'custrecord_gw_voucher_upload_status',
    })
    var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(
      _voucher_upload_status
    )
    //NONE
    var _need_upload_egui_mig = _record.getValue({
      fieldId: 'custrecord_gw_need_upload_egui_mig',
    })
    //NE-338
    if(_need_upload_egui_mig=='RETRIEVE'){
       _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc('RT')
    } 

    return _voucher_status_desc + ':' + _voucher_upload_status_desc
  }

  function loadInvoiceMigXml(voucherType, migType) {
    var _xmlString
    try {
      var _file_path = ''
      if (voucherType === 'EGUI') {
        if (migType == 'B2BE') {
          _file_path = _gw_mig_a0101_xml_path
        } else if (migType == 'B2BS') {
          //_file_path = _gw_mig_a0401_xml_path;
          _file_path = _gw_mig_c0401_xml_path //A0401轉成C0401
        } else if (migType == 'B2C') {
          _file_path = _gw_mig_c0401_xml_path
        }
      } else if (voucherType === 'ALLOWANCE') {
        if (migType == 'B2BE') {
          //TODO
          _file_path = _gw_mig_b0101_xml_path
        } else if (migType == 'B2BS') {
          //_file_path = _gw_mig_b0401_xml_path;
          _file_path = _gw_mig_d0401_xml_path //B0401轉成D0401
        } else if (migType == 'B2C') {
          _file_path = _gw_mig_d0401_xml_path
        }
      }
      if (_file_path !== '') _xmlString = file.load(_file_path).getContents()
    } catch (e) {
      log.debug(e.name, e.message)
    }
    return _xmlString
  }

  function onRequest(context) {
    var _selected_voucher_type = context.request.parameters.voucher_type
    var _selected_voucher_internal_id =
      context.request.parameters.voucher_internal_id
    ///////////////////////////////////////////////////////////////////////////////////////////
    //處理資料
    ///////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-START
    ///////////////////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '電子發票作業（發票資料）',
    })
    /////////////////////////////////////////////////////////////////////////////
    var _voucher_type = 'EGUI'
    var _b2bs_xml = loadInvoiceMigXml(_voucher_type, 'B2BS')
    var _b2be_xml = loadInvoiceMigXml(_voucher_type, 'B2BE')
    var _b2c_xml = loadInvoiceMigXml(_voucher_type, 'B2C')

    var _b2bs_xml_field = form.addField({
      id: 'custpage_b2bs_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2bs_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2bs_xml_field.defaultValue = _b2bs_xml

    var _b2be_xml_field = form.addField({
      id: 'custpage_b2be_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2be_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2be_xml_field.defaultValue = _b2be_xml

    var _b2c_xml_field = form.addField({
      id: 'custpage_b2c_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2c_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2c_xml_field.defaultValue = _b2c_xml

    ////////////////////////////////////////////////////////////////////////////
    form.addButton({
      id: 'custpage_print_pdf_button',
      label: 'PDF下載',
      functionName: 'printPDFSelected("EGUI")',
    })

    /////////////////////////////////////////////////////////////////////////////////////////
    var _voucher_main_record = createFormHeader(form, _selected_voucher_internal_id)
    //發票明細
    var _document_list_ary = searchEGUIDetails(form, _selected_voucher_internal_id)
    //同步資料
    synceguidocument.syncEguiInfoToNetsuiteDoc(_voucher_main_record, _document_list_ary)
    //上傳紀錄
    searchUploadLogDetails(form, _selected_voucher_internal_id)
    //折讓單明細
    searchAllowanceDetails(form, _selected_voucher_internal_id)
    //NS-文件清單
    searchNetsuiteDocumentList(form, _selected_voucher_internal_id)
    ////////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-END
    ///////////////////////////////////////////////////////////////////////////////////////////
    //紀錄 Invoice selected
    var _hidden_voucher_listld = form.addField({
      id: 'custpage_voucher_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_voucher_listld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _hidden_voucher_listld.defaultValue = _selected_voucher_internal_id

    var _hidden_voucher_internal_id = form.addField({
      id: 'voucher_internal_id',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_voucher_internal_id.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _hidden_voucher_internal_id.defaultValue = _selected_voucher_internal_id

    form.clientScriptModulePath = './gw_voucherview_ui_event.js'
    context.response.writePage(form)
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})