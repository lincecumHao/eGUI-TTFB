/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/redirect',
  'N/search',
  'N/format',
  'N/record',
  'N/file',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_lib_sl_utility'
], function (
  runtime,
  serverWidget,
  redirect,
  search,
  format,
  record,
  file,
  stringutility,
  invoiceutility,
  dateutility,
  gwconfigure,
  gwLibSuiteLetUtility
) {
  var defaultAccount = gwconfigure.getGwInvoiceEditDefaultAccount()
  var _gwVoucherGenxmlScriptId = gwconfigure.getGwVoucherGenxmlScriptId()
  var _gwVoucherGenxmlDeployId = gwconfigure.getGwVoucherGenxmlDeploymentId()

  var _gw_voucher_main_search_id = gwconfigure.getGwVoucherMainSearchId()

  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()

  var _gw_mig_a0101_xml_path = gwconfigure.getGwMigA0101XmlPath()
  var _gw_mig_a0401_xml_path = gwconfigure.getGwMigA0401XmlPath()
  var _gw_mig_c0401_xml_path = gwconfigure.getGwMigC0401XmlPath()
  var _gw_mig_b0101_xml_path = gwconfigure.getGwMigB0101XmlPath()
  var _gw_mig_b0401_xml_path = gwconfigure.getGwMigB0401XmlPath()
  var _gw_mig_d0401_xml_path = gwconfigure.getGwMigD0401XmlPath() //C0401的折讓單
  var _version = gwconfigure.getGwMigVersion() //GateWeb API Version

  function getSelectName(form, searchFieldId, entityId) {
    var _text = ''
    if (entityId !== '') {
      var _field = form.getField({
        id: searchFieldId,
      })
      var _options = _field.getSelectOptions({
        filter: entityId,
      })

      for (var i = 0; i < _options.length; i++) {
        var _value = _options[i].value
        if (_value === entityId) {
          _text = _options[i].text
        }
      }

      if (_text === '') _text = entityId
    } else {
      _text = ' '
    }

    return _text
  }

  /**
   * voucher_type : 憑證類別(EGUI/ALLOWANCE)
   * customerid : 客戶代碼
   * deptcode : 開立部門代碼
   * classification : 開立類別代碼
   * voucher_number : GW憑證號碼
   * transtartdate : 單據日期(起始)
   * tranenddate : 單據日期(截止)
   *
   */
  function searchVoucherList(
    form,
    subListObj,
    voucher_type,
	business_no,
    customerid,
    deptcode,
    classification,
    voucher_number,
    transtartdate,
    tranenddate
  ) {
    var _mySearch = search.load({
      id: _gw_voucher_main_search_id,
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_voucher_type',
      search.Operator.IS,
      voucher_type,
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_is_manual_voucher',
      search.Operator.IS,
      true,
    ])
    /**
     if (customerid != '') {
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_buyer', search.Operator.IS, customerid])
    }
     */
	if (business_no != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_seller',
        search.Operator.IS,
        business_no,
      ])
    }
    if (customerid != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_original_buyer_id',
        search.Operator.IS,
        customerid,
      ])
    }

    if (deptcode != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_dept_code',
        search.Operator.IS,
        deptcode,
      ])
    }
    if (classification != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_classification',
        search.Operator.IS,
        classification,
      ])
    }

    if (voucher_number != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_number',
        search.Operator.IS,
        voucher_number,
      ])
    }
    if (transtartdate != '') {
      var _date = dateutility.getConvertDateByDate(transtartdate.toString())
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.GREATERTHANOREQUALTO,
        stringutility.convertToInt(_date),
      ])
    }
    if (tranenddate != '') {
      var _date = dateutility.getConvertDateByDate(tranenddate.toString())
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.LESSTHANOREQUALTO,
        stringutility.convertToInt(_date),
      ])
    }

    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_status',
      'isnot',
      'VOUCHER_UNLOCKED',
    ])
    _mySearch.filterExpression = _filterArray
    log.debug('UI List filterArray', JSON.stringify(_filterArray))
    ///////////////////////////////////////////////////////////////////////////////////
    var _index = 0
    var _indexId = ''
    var _indexApplyId = ''
    var _documentNos = ''

    var _pagedData = _mySearch.runPaged({
      pageSize: 1000,
    })

    for (var i = 0; i < _pagedData.pageRanges.length; i++) {
      var _currentPage = _pagedData.fetch(i)
      _currentPage.data.forEach(function (result) {
        var _result = JSON.parse(JSON.stringify(result))
        log.debug({ title: 'search each result', details: result })
        //1.Main Information
        var _id = _result.id //948
        var _mig_type = _result.values.custrecord_gw_mig_type //B2BS, B2BE, B2C
        var _voucher_number = _result.values.custrecord_gw_voucher_number
        var _voucher_date = _result.values.custrecord_gw_voucher_date
        var _voucher_time = _result.values.custrecord_gw_voucher_time
        var _voucher_yearmonth = _result.values.custrecord_gw_voucher_yearmonth
        var _seller = _result.values.custrecord_gw_seller
        var _buyer = _result.values.custrecord_gw_buyer
        var _buyer_name = _result.values.custrecord_gw_buyer_name
        if (_buyer_name=='')_buyer_name=_buyer
        var _invoice_type = _result.values.custrecord_gw_invoice_type
        var _sales_amount = _result.values.custrecord_gw_sales_amount
        var _free_sales_amount = _result.values.custrecord_gw_free_sales_amount
        var _zero_sales_amount = _result.values.custrecord_gw_zero_sales_amount
        var _tax_amount = _result.values.custrecord_gw_tax_amount
        var _tax_rate = _result.values.custrecord_gw_tax_rate
        var _tax_type = _result.values.custrecord_gw_tax_type
        var _total_amount = _result.values.custrecord_gw_total_amount
        var _voucher_dept_code = _result.values.custrecord_gw_voucher_dept_code
        var _voucher_classification =
          _result.values.custrecord_gw_voucher_classification
        var _voucher_status = _result.values.custrecord_gw_voucher_status
        var _voucher_upload_status =
          _result.values.custrecord_gw_voucher_upload_status
        var _discount_count = _result.values.custrecord_gw_discount_count
        var _print_mark = _result.values.custrecord_gw_print_mark

        var _uploadstatus_messag =
          _result.values.custrecord_gw_uploadstatus_messag
        var _need_upload_egui_mig =
          _result.values.custrecord_gw_need_upload_egui_mig //Y/N

        //處理 Print 紀錄
        var _is_printed = '' //_mig_type
        var _is_printed_paper = _result.values.custrecord_gw_is_printed_paper
        var _is_printed_pdf = _result.values.custrecord_gw_is_printed_pdf
        if (_is_printed_pdf == true) _is_printed = '是'

       	var _gw_original_buyer_id = _result.values.custrecord_gw_original_buyer_id
        	
        //四捨五入
        //_tax_rate     = (stringutility.convertToFloat(_tax_rate)/100).toFixed(2);
        _sales_amount = Math.round(
          stringutility.convertToFloat(_sales_amount) +
            stringutility.convertToFloat(_free_sales_amount) +
            stringutility.convertToFloat(_zero_sales_amount)
        ).toString()
        _tax_amount = Math.round(
          stringutility.convertToFloat(_tax_amount)
        ).toString()
        _total_amount = Math.round(
          stringutility.convertToFloat(_total_amount)
        ).toString()

        //Item Details
        var _ns_document_type =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type'
          ]
        var _ns_document_apply_id =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_apply_id'
          ]
        var _ns_document_number =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_number'
          ]

        if (_indexId != _id) {
          if (_indexId != '') _index++

          _documentNos = '' //需設空值
          subListObj.setSublistValue({
            id: 'customer_search_voucher_id',
            line: _index,
            value: _id,
          })
          subListObj.setSublistValue({
            id: 'customer_invoice_tranid',
            line: _index,
            value: _id + '-' + _voucher_number,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_number',
            line: _index,
            value: stringutility.trimOrAppendBlank(_voucher_number),
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_date',
            line: _index,
            value: _voucher_date + ' ' + _voucher_time,
          })
          
          subListObj.setSublistValue({
              id: 'customer_mig_type',
              line: _index,
              value: _mig_type
          })
          
          subListObj.setSublistValue({
              id: 'customer_original_buyer_id',
              line: _index,
              value: _gw_original_buyer_id,
          })
          
          subListObj.setSublistValue({
            id: 'customer_voucher_buyer',
            line: _index,
            value: stringutility.trimOrAppendBlank(_buyer),
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_buyer_name',
            line: _index,
            value: stringutility.trimOrAppendBlank(_buyer_name),
          })

          var _departmentname = getSelectName(
            form,
            'custpage_select_deptcode',
            stringutility.trimOrAppendBlank(_voucher_dept_code)
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_dept_code',
            line: _index,
            value: _departmentname,
          })
          var _classname = getSelectName(
            form,
            'custpage_select_classification',
            stringutility.trimOrAppendBlank(_voucher_classification)
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_class',
            line: _index,
            value: _classname,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_status',
            line: _index,
            value: _voucher_status,
          })

          var _voucher_status_desc = invoiceutility.getVoucherStatusDesc(
            _voucher_status
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_upload_status',
            line: _index,
            value: _voucher_upload_status,
          })
          var _voucher_manual_egui = ' '
          if (stringutility.trim(_need_upload_egui_mig) == 'N') {
            _voucher_manual_egui = '是'
            _voucher_upload_status = 'M'
          }

          subListObj.setSublistValue({
            id: 'customer_voucher_sales_amount',
            line: _index,
            value: _sales_amount,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_rate',
            line: _index,
            value: _tax_rate,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_type',
            line: _index,
            value: gwconfigure.getGwTaxCodeNameByGWTaxCode(_tax_type),
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_amount',
            line: _index,
            value: _tax_amount,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_total_amount',
            line: _index,
            value: _total_amount,
          })
          var _discounted = ' '
          if (parseInt(_discount_count) > 0) _discounted = '是'
          subListObj.setSublistValue({
            id: 'customer_voucher_discounted',
            line: _index,
            value: _discounted,
          })

          _indexId = _id
        }

        var _applyId = _ns_document_type + ':' + _ns_document_number + ','
        var _relate_number = subListObj.getSublistValue({
          id: 'customer_voucher_relate_number',
          line: _index,
        })
      })
    }
    ///////////////////////////////////////////////////////////////////////////////////
  }

  function createForm(form) {
	///////////////////////////////////////////////////////////////////////////////////
    //公司別
    var _selectBusinessNo = form.addField({
      id: 'custpage_businessno',
      type: serverWidget.FieldType.SELECT,
      label: '統一編號' 
    })
    _selectBusinessNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    ///////////////////////////////////////////////////////////////////////////////////
    var currentUserObject = runtime.getCurrentUser()
    var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
    gwLibSuiteLetUtility.addBusinessEntitySelectOption(_company_ary, _selectBusinessNo)
    //////////////////////////////////////////////////////////////////////////////////  
    //客戶代碼
    var _selectCustomerCode = form.addField({
      id: 'custpage_selectcustomerid',
      type: serverWidget.FieldType.SELECT,
      label: '買方公司',
      source: 'customer',
    })
    /**
     _selectCustomerCode.addSelectOption({
      value: '',
      text: 'NONE',
    })
     */
    _selectCustomerCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    /**
     //20201112 walter modify
     var _type    = search.Type.CUSTOMER;
     var _filters = [];
     var _columns = ['vatregnumber','companyname'];
     var _allCustomers = searchutility.getSearchResult(_type, _filters, _columns);
     _allCustomers.forEach(function (result) {
	   var _internalid = result.id; 
	   
	   var _entityid = result.getValue({
          name: 'vatregnumber',
       }) 
	   var _name = result.getValue({
		  name: 'companyname',
	   })
	   _selectCustomerCode.addSelectOption({
		 value: _entityid,
		 text: _entityid + '-' + _name,
	   })
	})
     */
    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_select_deptcode',
      type: serverWidget.FieldType.SELECT,
      label: '發票部門',
    })
    _selectDeptCode.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectDeptCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
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

        _selectDeptCode.addSelectOption({
          value: _internalid,
          text: _internalid + '-' + _name,
        })
        return true
      })
    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_select_classification',
      type: serverWidget.FieldType.SELECT,
      label: '發票分類',
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectClassification.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
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

    //EGUI單據號碼
    var _voucher_number = form.addField({
      id: 'custpage_select_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '歷史發票 #',
    })
    _voucher_number.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //單據日期
    var _tran_start_date = form.addField({
      id: 'custpage_select_transtartdate',
      type: serverWidget.FieldType.DATE,
      label: '歷史發票開始日期',
    })
    _tran_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    var _tran_end_date = form.addField({
      id: 'custpage_select_tranenddate',
      type: serverWidget.FieldType.DATE,
      label: '歷史發票結束日期',
    })
    _tran_end_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
  }

  //發票明細
  function createInvoiceSubList(form) {
    var _sublist = form.addSublist({
      id: 'vouchersublistid',
      type: serverWidget.SublistType.LIST,
      label: '歷史發票 # List',
    })

    _sublist.addButton({
      id: 'buttonid_mark',
      label: 'Mark All',
      functionName:
        'mark(true,"vouchersublistid","customer_search_voucher_id","customer_search_voucher_check_id")',
    })

    _sublist.addButton({
      id: 'buttonid_unmark',
      label: 'Unmark All',
      functionName:
        'mark(false,"vouchersublistid","customer_search_voucher_id","customer_search_voucher_check_id")',
    })

    /////////////////////////////////////////////////////////////////////////////
    //access check box
    var _idField = _sublist.addField({
      id: 'customer_search_voucher_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _checkboxfield = _sublist.addField({
      id: 'customer_search_voucher_check_id',
      type: serverWidget.FieldType.CHECKBOX,
      label: '順序',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })
    var _uploadStatusField = _sublist.addField({
      id: 'customer_voucher_upload_status',
      label: 'Status ID',
      type: serverWidget.FieldType.TEXT,
    })
    _uploadStatusField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _voucherStatusField = _sublist.addField({
      id: 'customer_voucher_status',
      label: 'Voucher Status',
      type: serverWidget.FieldType.TEXT,
    })
    _voucherStatusField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    /////////////////////////////////////////////////////////////////////////////
    //處理顯示欄位
    _sublist.addField({
      id: 'customer_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '歷史發票 #',
    })
    _sublist.addField({
      id: 'customer_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: '歷史發票日期',
    })
    _sublist.addField({
      id: 'customer_mig_type',
      type: serverWidget.FieldType.TEXT,
      label: '發票資料格式',
    })

    var _buyerField = _sublist.addField({
      id: 'customer_voucher_buyer',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司統編',
    })
    _buyerField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _sublist.addField({
      id: 'customer_voucher_buyer_name',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司',
    })
    
    var _originalBuyerIdField = _sublist.addField({
      id: 'customer_original_buyer_id',
      type: serverWidget.FieldType.TEXT,
      label: '買方客戶ID',
    })
    /**
    _originalBuyerIdField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    */
    _sublist.addField({
      id: 'customer_voucher_dept_code',
      type: serverWidget.FieldType.TEXT,
      label: '發票部門',
    })
    _sublist.addField({
      id: 'customer_voucher_class',
      type: serverWidget.FieldType.TEXT,
      label: '發票分類',
    })

    _sublist.addField({
      id: 'customer_voucher_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '銷售額',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_rate',
      type: serverWidget.FieldType.TEXT,
      label: '稅率',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_type',
      type: serverWidget.FieldType.TEXT,
      label: '課稅別',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅額',
    })
    _sublist.addField({
      id: 'customer_voucher_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總計',
    })
    _sublist.addField({
      id: 'customer_voucher_discounted',
      type: serverWidget.FieldType.TEXT,
      label: '是否折讓',
    })

    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    var form = serverWidget.createForm({
      title: '歷史發票維護作業',
    })
    /////////////////////////////////////////////////////////////////////////////
    var _voucher_type = 'EGUI'

    //Hiddent Element
    var _hidden_button_field = form.addField({
      id: 'custpage_hiddent_buttontype',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_button_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //紀錄 Invoice selected
    var _hidden_voucher_listld = form.addField({
      id: 'custpage_voucher_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_voucher_listld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    ////////////////////////////////////////////////////////////////////////////
    createForm(form)
    var _invoiceSubList = createInvoiceSubList(form)

    form.addButton({
      id: 'custpage_manual_voucher_button',
      label: '維護發票',
      functionName:
        'forwardToManualEdit("customscript_gw_invoice_ui_manual_edit","customdeploy_gw_invoice_ui_manual_edit", "maintain")',
    })
    
    form.addButton({
      id: 'custpage_manual_import_button',
      label: '匯入發票',
      functionName:
        'forwardToManualEdit("customscript_gw_manualegui_ui_import","customdeploy_gw_manualegui_ui_import", "import")',
    })

    form.addButton({
      id: 'custpage_delete_document_button',
      label: '刪除',
      functionName: 'deleteManualItem()',
    })

    form.addButton({
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    form.clientScriptModulePath = './gw_invoice_ui_manual_event.js'
    //form.clientScriptModulePath = './gw_invoice_ui_manual_event_v2.js'

    context.response.writePage(form)

    var _buttonType = context.request.parameters.custpage_hiddent_buttontype
    if (context.request.method === 'POST' || _buttonType == 'ReSearch') {
      //Open Document
      var _voucher_list_id =
        context.request.parameters.custpage_voucher_hiddent_listid
      log.debug('_buttonType: ', _buttonType)
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //search
	  var _select_businessno =
            context.request.parameters.custpage_businessno  
      var _selectcustomerid =
        context.request.parameters.custpage_selectcustomerid
      var _select_deptcode = context.request.parameters.custpage_select_deptcode
      var _select_classification =
        context.request.parameters.custpage_select_classification
      var _select_voucher_number =
        context.request.parameters.custpage_select_voucher_number
      var _select_transtartdate =
        context.request.parameters.custpage_select_transtartdate
      var _select_tranenddate =
        context.request.parameters.custpage_select_tranenddate

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      var _scriptObj = runtime.getCurrentScript()
      var _scriptId = _scriptObj.id
      var _deploymentId = _scriptObj.deploymentId
      log.debug('ScriptId Id: ', _scriptId)
      log.debug('Deployment Id: ', _deploymentId)

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_select_businessno) return
      var _businessnoField = form.getField({
        id: 'custpage_businessno',
      })
      _businessnoField.defaultValue = _select_businessno
	  var _customeridField = form.getField({
        id: 'custpage_selectcustomerid',
      })
      if (_selectcustomerid !== '') {
        _customeridField.defaultValue = _selectcustomerid
      }
      var _deptcodeField = form.getField({
        id: 'custpage_select_deptcode',
      })
      _deptcodeField.defaultValue = _select_deptcode
      var _classificationField = form.getField({
        id: 'custpage_select_classification',
      })
      _classificationField.defaultValue = _select_classification

      var _voucherNumberField = form.getField({
        id: 'custpage_select_voucher_number',
      })
      _voucherNumberField.defaultValue = _select_voucher_number

      var _transtartdateField = form.getField({
        id: 'custpage_select_transtartdate',
      })
      _transtartdateField.defaultValue = _select_transtartdate
      var _tranenddateField = form.getField({
        id: 'custpage_select_tranenddate',
      })
      _tranenddateField.defaultValue = _select_tranenddate

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get Invoice LIST _invoiceSubList
      searchVoucherList(
        form,
        _invoiceSubList,
        _voucher_type,
		_select_businessno,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_voucher_number,
        _select_transtartdate,
        _select_tranenddate
      )
      //search result end
      //end access file
    }
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
