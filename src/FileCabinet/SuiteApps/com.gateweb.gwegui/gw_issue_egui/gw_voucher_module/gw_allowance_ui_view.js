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
  '../../gw_dao/taxType/gw_dao_tax_type_21',
  '../gw_common_utility/gw_syncegui_to_document_utility',
  '../gw_common_utility/gw_common_configure',
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
  taxyype21,
  synceguidocument,
  gwconfigure
) {
  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  //憑證 Information View
  var _voucher_view_script_id = 'customscript_gw_egui_ui_view'
  var _voucher_view_deploy_id = 'customdeploy_gw_egui_ui_view'

  var _gw_mig_a0101_xml_path = gwconfigure.getGwMigA0101XmlPath()
  var _gw_mig_a0401_xml_path = gwconfigure.getGwMigA0401XmlPath()
  var _gw_mig_c0401_xml_path = gwconfigure.getGwMigC0401XmlPath()
  var _gw_mig_b0101_xml_path = gwconfigure.getGwMigB0101XmlPath()
  var _gw_mig_b0401_xml_path = gwconfigure.getGwMigB0401XmlPath()
  var _gw_mig_d0401_xml_path = gwconfigure.getGwMigD0401XmlPath() //C0401的折讓單
  var _version = gwconfigure.getGwMigVersion() //GateWeb API Version

  //放公司基本資料
  var _companyObjAry = []
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
  
  function loadAllTaxInformation_BAK() {
    try {
      var _group_type = 'TAX_TYPE'
      var _mySearch = search.create({
        type: _gw_voucher_properties,
        columns: [
          search.createColumn({ name: 'custrecord_gw_voucher_property_id' }), //TAX_WITH_TAX
          search.createColumn({ name: 'custrecord_gw_voucher_property_value' }), //1
          search.createColumn({ name: 'custrecord_gw_voucher_property_note' }), //應稅
          search.createColumn({ name: 'custrecord_gw_netsuite_id_value' }), //8
          search.createColumn({ name: 'custrecord_gw_netsuite_id_text' }), //VAT_TW TAX 5%-TW
        ],
      })

      var _filterArray = []
      _filterArray.push(['custrecord_gw_voucher_group_type', 'is', _group_type])
      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) { 
    	log.debug(_gw_voucher_properties+' result', JSON.stringify(result))
    	
        var internalid = result.id

        var _voucher_property_id = result.getValue({
          name: 'custrecord_gw_voucher_property_id',
        })
        var _voucher_property_value = result.getValue({
          name: 'custrecord_gw_voucher_property_value',
        })
        var _voucher_property_note = result.getValue({
          name: 'custrecord_gw_voucher_property_note',
        })
        var _netsuite_id_value = result.getValue({
          name: 'custrecord_gw_netsuite_id_value',
        })
        var _netsuite_id_text = result.getValue({
          name: 'custrecord_gw_netsuite_id_text',
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
      log.error(e.name, e.message)
    }
  }

  //取得稅別資料
  function getTaxInformation(netsuiteId) {
    return _taxObjAry.filter(function (_obj) {
      return _obj.netsuite_id_value.toString() === netsuiteId.toString()
    })[0]
    // var _taxObj
    // try {
    //   if (_taxObjAry != null) {
    //     for (var i = 0; i < _taxObjAry.length; i++) {
    //       var _obj = JSON.parse(JSON.stringify(_taxObjAry[i]))
    //
    //       if (_obj.netsuite_id_value == netsuiteId) {
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
  
  function getTaxInformation_BAK(netsuiteId) {
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
      log.error(e.name, e.message)
    }

    return _taxObj
  }

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
        label: '折讓開立-重傳',
        functionName: 'reApplyVoucherTask(' + voucher_internal_id + ')',
      })
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
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
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    //C or E
    var _voucher_upload_status = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_upload_status',
    })
    //單據狀態 [VOUCHER_SUCCESS]
    var _voucher_status = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_status',
    })
    var _is_printed_pdf = _voucher_record.getValue({
      fieldId: 'custrecord_gw_is_printed_pdf',
    })
    
    var _gw_invoice_type = _voucher_record.getValue({
      fieldId: 'custrecord_gw_invoice_type',
    })
    var _voucher_format_code = _voucher_record.getValue({
      fieldId: 'custrecord_gw_voucher_format_code',
    })
        
    if (_is_printed_pdf == true || _gw_invoice_type != '07' || _voucher_format_code != '33') {
      var _print_pdf_button = form.getButton({
        id: 'custpage_print_pdf_button',
      })
      _print_pdf_button.isDisabled = true
    }
    var _is_printed_paper = _voucher_record.getValue({
      fieldId: 'custrecord_gw_is_printed_paper',
    })
    if (_is_printed_paper == true) {
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
    //折讓單號碼
    var _voucher_number_field = form.addField({
      id: 'custpage_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '折讓單號碼',
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
    //折讓單日期
    var _voucher_date_field = form.addField({
      id: 'custpage_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: '折讓單日期',
      container: 'row01_fieldgroupid',
    })
    _voucher_date_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    _voucher_date_field.defaultValue = _voucher_record
      .getValue({ fieldId: 'custrecord_gw_voucher_date' })
      .toString()
    //折讓單時間
    var _voucher_time_field = form.addField({
      id: 'custpage_voucher_time',
      type: serverWidget.FieldType.TEXT,
      label: '折讓單時間',
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
    if (_gw_need_upload_egui_mig=='RETRIEVE'){
    	_voucher_upload_status_desc = invoiceutility.getUploadStatusDesc('RT')
    }else if (_gw_need_upload_egui_mig=='NONE'){
    	_voucher_upload_status_desc = invoiceutility.getUploadStatusDesc('M')
    }

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

    //處理重傳
    reApplyTaskButton(
      form,
      _voucher_internal_id,
      _voucher_upload_status,
      _voucher_status
    )

    var _allowance_type_field = form.addField({
      id: 'custpage_allowance_type',
      type: serverWidget.FieldType.TEXT,
      label: '折讓方式',
      container: 'row01_fieldgroupid',
    })
    _allowance_type_field.defaultValue = '賣方開立'
    _allowance_type_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
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
    ////////////////////////////////////////////////////////////////////////
    var _hide_company_ban = form.addField({
      id: 'custpage_hide_company_ban',
      type: serverWidget.FieldType.TEXT,
      label: '公司統編',
      container: 'row01_fieldgroupid',
    })
    _hide_company_ban.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_seller',
    })
    _hide_company_ban.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    ////////////////////////////////////////////////////////////////////////
    _company_ban.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED,
    })
    
    _company_ban.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
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
    ////////////////////////////////////////////////////////////////////////////////////////////////
    //未稅銷售額
    var _sales_amount = form.addField({
      id: 'custpage_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總退款額',
      container: 'row01_fieldgroupid',
    })
    var _total_sales_amount =
      _voucher_record.getValue({ fieldId: 'custrecord_gw_sales_amount' }) +
      _voucher_record.getValue({ fieldId: 'custrecord_gw_free_sales_amount' }) +
      _voucher_record.getValue({ fieldId: 'custrecord_gw_zero_sales_amount' })
    _sales_amount.defaultValue = _total_sales_amount
    _sales_amount.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    })
    //總退稅額
    var _tax_amount = form.addField({
      id: 'custpage_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總退稅額',
      container: 'row01_fieldgroupid',
    })
    _tax_amount.defaultValue = _voucher_record.getValue({
      fieldId: 'custrecord_gw_tax_amount',
    })
    ///////////////////////////////////////////////////////////////////////////////////
    return _voucher_record
  } //End Function

  //發票明細
  function searchAllowanceDetails(form, _selected_voucher_internal_id) {
	var _document_list_ary = []
    //處理 Detail
    var sublist = form.addSublist({
      id: 'invoicesublistid',
      type: serverWidget.SublistType.LIST,
      label: '商品-清單',
    })
    var _seqField = sublist.addField({
      id: 'customer_search_invoice_seq',
      type: serverWidget.FieldType.TEXT,
      label: '順序',
    })
    var _eguiNumberField = sublist.addField({
      id: 'custpage_egui_number',
      type: serverWidget.FieldType.TEXT,
      label: '發票號碼',
    })
    var _itemNameField = sublist.addField({
      id: 'custpage_item_name',
      type: serverWidget.FieldType.TEXT,
      label: '名稱',
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
      id: 'custpage_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅金',
    })
    sublist.addField({
      id: 'custpage_tax_type',
      type: serverWidget.FieldType.TEXT,
      label: '課稅別',
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
        search.createColumn({ name: 'custrecord_gw_dtl_item_tax_rate' }),
        search.createColumn({ name: 'custrecord_gw_item_tax_amount' }),
        search.createColumn({ name: 'custrecord_gw_dtl_item_tax_code' }),
        search.createColumn({ name: 'custrecord_gw_original_gui_number' }),
        search.createColumn({ name: 'custrecord_gw_ns_document_type' }),
        search.createColumn({ name: 'custrecord_gw_ns_document_apply_id' })
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
      var _item_tax_rate = _result.values.custrecord_gw_dtl_item_tax_rate //5.00
      var _item_amount = _result.values.custrecord_gw_item_amount
      var _item_tax_amount = _result.values.custrecord_gw_item_tax_amount
      var _item_tax_code = _result.values.custrecord_gw_dtl_item_tax_code
      var _gui_number = _result.values.custrecord_gw_original_gui_number
      
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

      if (stringutility.trim(_item_tax_amount) == '') {
        _item_tax_amount = (
          (stringutility.convertToFloat(_item_amount) *
            stringutility.convertToFloat(_item_tax_rate)) /
          100
        ).toString()
      }

      sublist.setSublistValue({
        id: 'customer_search_invoice_seq',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_seq),
      })
      sublist.setSublistValue({
        id: 'custpage_egui_number',
        line: row,
        value: stringutility.trimOrAppendBlank(_gui_number),
      })
      sublist.setSublistValue({
        id: 'custpage_item_name',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_description),
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
        id: 'custpage_item_amount',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_amount),
      })
      sublist.setSublistValue({
        id: 'custpage_tax_amount',
        line: row,
        value: stringutility.trimOrAppendBlank(_item_tax_amount),
      })

      ///////////////////////////////////////////////////////////////////
      var _tax_code_desc = '應稅(一般稅率)'
      var _taxObj = getTaxInformation(_item_tax_code)
      if (typeof _taxObj !== 'undefined') {
        if (_taxObj.voucher_property_value == '1') {
          //with tax
          _tax_code_desc = '應稅(一般稅率)'
        } else if (_taxObj.voucher_property_value == '2') {
          //zero
          _tax_code_desc = '零稅(一般稅率)'
        } else if (_taxObj.voucher_property_value == '3') {
          //free
          _tax_code_desc = '免稅(一般稅率)'
        }
      }
      sublist.setSublistValue({
        id: 'custpage_tax_type',
        line: row,
        value: stringutility.trimOrAppendBlank(_tax_code_desc),
      })
      ///////////////////////////////////////////////////////////////////

      row++

      return true
    })
    /////////////////////////////////////////////////////////////////////////////////////////
    return _document_list_ary
  }

  //發票明細
  function searchEGUIDetails(form, _selected_voucher_internal_id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'allowancesublistid',
      type: serverWidget.SublistType.LIST,
      label: '扣抵電子發票-清單',
    })
    var _viewField = sublist.addField({
      id: 'custpage_egui_view',
      type: serverWidget.FieldType.URL,
      label: '檢視-電子發票',
    })
    _viewField.linkText = '檢視-電子發票'
    var _numberField = sublist.addField({
      id: 'custpage_egui_number',
      type: serverWidget.FieldType.TEXT,
      label: '發票號碼',
    })
    var _dateField = sublist.addField({
      id: 'custpage_egui_date',
      label: '發票日期',
      type: serverWidget.FieldType.TEXT,
    })

    //1.處理 Voucher Detail Items
    var _mySearch = search.create({
      type: 'customrecord_gw_voucher_details',
      columns: [
        search.createColumn({ name: 'custrecord_gw_original_gui_internal_id' }),
        search.createColumn({ name: 'custrecord_gw_original_gui_number' }),
        search.createColumn({ name: 'custrecord_gw_original_gui_date' }),
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
    log.debug('searchEGUIDetails filterArray', JSON.stringify(_filterArray))
    ////////////////////////////////////////////////////////////////////////////////////////
    var row = 0
    var _index_original_gui_number = ''
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('searchEGUIDetails result', JSON.stringify(result))

      var _original_gui_internal_id =
        _result.values.custrecord_gw_original_gui_internal_id
      var _original_gui_number =
        _result.values.custrecord_gw_original_gui_number
      var _original_gui_date = _result.values.custrecord_gw_original_gui_date

      if (_index_original_gui_number.indexOf(_original_gui_number) == -1) {
        _index_original_gui_number += _original_gui_number

        sublist.setSublistValue({
          id: 'custpage_egui_number',
          line: row,
          value: stringutility.trimOrAppendBlank(_original_gui_number),
        })
        sublist.setSublistValue({
          id: 'custpage_egui_date',
          line: row,
          value: stringutility.trimOrAppendBlank(_original_gui_date),
        })
        ///////////////////////////////////////////////////////////////////////
        var _params = {
          voucher_type: 'EGUI',
          voucher_internal_id: parseInt(_original_gui_internal_id),
        }
        var _url_value = url.resolveScript({
          scriptId: _voucher_view_script_id,
          deploymentId: _voucher_view_deploy_id,
          params: _params,
        })
        sublist.setSublistValue({
          id: 'custpage_egui_view',
          line: row,
          value: _url_value,
        })
        ///////////////////////////////////////////////////////////////////////
        row++
      }
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
      //var _ns_document_apply_id = _result.values.custrecord_gw_ns_document_apply_id
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

  //上傳紀錄
  function searchUploadLogDetails(form, _selected_voucher_internal_id) {
    //處理Detail
    var sublist = form.addSublist({
      id: 'uploadlogsublistid',
      type: serverWidget.SublistType.LIST,
      label: '上傳紀錄-清單',
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
        search.createColumn({ name: 'custrecord_gw_download_voucher_message' }),
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
        _upload_voucher_migtype == 'B0101' ||
        _upload_voucher_migtype == 'B0401' ||
        _upload_voucher_migtype == 'D0401'
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
        value: _upload_voucher_xml,
      })

      row++
      return true
    })

    /////////////////////////////////////////////////////////////////////////////////////////
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
    //載入稅別資料
      _taxObjAry = loadAllTaxInformation()
    ///////////////////////////////////////////////////////////////////////////////////////////
    //處理資料
    ///////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-START
    ///////////////////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '折讓(電子發票)作業（折讓單資料）',
    })
    ////////////////////////////////////////////////////////////////////////////////////////
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
    /////////////////////////////////////////////////////////////////////////////
    var _voucher_type = 'ALLOWANCE'
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
    ////////////////////////////////////////////////////////////////////////////
    form.addButton({
      id: 'custpage_print_pdf_button',
      label: 'PDF下載',
      functionName: 'printPDFSelected("ALLOWANCE")',
    })

    /////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////
    var _voucher_main_record = createFormHeader(form, _selected_voucher_internal_id)
    //折讓單明細
    var _document_list_ary = searchAllowanceDetails(form, _selected_voucher_internal_id)
    //同步資料
    synceguidocument.syncEguiInfoToNetsuiteDoc(_voucher_main_record, _document_list_ary)
    //上傳紀錄
    searchUploadLogDetails(form, _selected_voucher_internal_id)
    //發票明細
    searchEGUIDetails(form, _selected_voucher_internal_id)
    //NS-文件清單
    searchNetsuiteDocumentList(form, _selected_voucher_internal_id)
    ////////////////////////////////////////////////////////////////////////////////////////////
    //做畫面-END
    ///////////////////////////////////////////////////////////////////////////////////////////
    form.clientScriptModulePath = './gw_voucherview_ui_event.js'
    context.response.writePage(form)
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
