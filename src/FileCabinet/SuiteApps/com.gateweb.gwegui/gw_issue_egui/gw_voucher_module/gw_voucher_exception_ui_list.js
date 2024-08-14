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
    _voucher_upload_status,
    voucher_number,
    transtartdate,
    tranenddate,
    document_type,
    document_no
  ) {
    var _mySearch = search.load({
      id: _gw_voucher_main_search_id,
    })

    var _filterArray = []
    /**
     _filterArray.push([
     'custrecord_gw_voucher_type',
     search.Operator.IS,
     voucher_type,
     ])
     */
    _filterArray.push([
      'custrecord_gw_voucher_status',
      'is',
      'VOUCHER_UNLOCKED',
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
    if (_voucher_upload_status != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_upload_status',
        search.Operator.IS,
        _voucher_upload_status,
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

    if (document_type != '') {
      _filterArray.push('and')
      _filterArray.push([
        'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type',
        search.Operator.IS,
        document_type,
      ])
    }
    if (document_no != '') {
      _filterArray.push('and')
      _filterArray.push([
        'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_number',
        search.Operator.CONTAINS,
        document_no,
      ])
    }

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
        var _voucher_type = _result.values.custrecord_gw_voucher_type //EGUI, ALLOWANCE
        var _mig_type = _result.values.custrecord_gw_mig_type //B2BS, B2BE, B2C
        var _voucher_number = _result.values.custrecord_gw_voucher_number
        var _voucher_date = _result.values.custrecord_gw_voucher_date
        var _voucher_time = _result.values.custrecord_gw_voucher_time
        var _voucher_yearmonth = _result.values.custrecord_gw_voucher_yearmonth
        var _seller = _result.values.custrecord_gw_seller
        var _buyer = _result.values.custrecord_gw_buyer
        var _buyer_name = _result.values.custrecord_gw_buyer_name
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
        var _is_printed = _result.values.custrecord_gw_is_printed
        var _uploadstatus_messag =
          _result.values.custrecord_gw_uploadstatus_messag
        var _need_upload_egui_mig =
          _result.values.custrecord_gw_need_upload_egui_mig //Y/N
        var _is_manual_voucher = _result.values.custrecord_gw_is_manual_voucher

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
            id: 'customer_voucher_type',
            line: _index,
            value: stringutility.trimOrAppendBlank(_voucher_type),
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
            id: 'customer_voucher_buyer',
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

          var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(
            _voucher_upload_status
          )
          if (stringutility.trim(_uploadstatus_messag) != '') {
            _voucher_upload_status_desc =
              _voucher_upload_status_desc +
              ':' +
              stringutility.trim(_uploadstatus_messag)
          } else {
            _voucher_upload_status_desc =
              _voucher_status_desc + ':' + _voucher_upload_status_desc
          }

          _voucher_upload_status_desc = _voucher_upload_status_desc.substring(
            0,
            300
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_upload_status_desc',
            line: _index,
            value: _voucher_upload_status_desc,
          })

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
          subListObj.setSublistValue({
            id: 'customer_voucher_isprinted',
            line: _index,
            value: stringutility.trimOrAppendBlank(_is_printed),
          })
          var _discounted = ' '
          if (parseInt(_discount_count) > 0) _discounted = '是'
          subListObj.setSublistValue({
            id: 'customer_voucher_discounted',
            line: _index,
            value: _discounted,
          })

          var _voucher_manual_egui = ' '
          if (_is_manual_voucher == true) {
            _voucher_manual_egui = '是'
          }
          subListObj.setSublistValue({
            id: 'customer_voucher_manual_egui',
            line: _index,
            value: _voucher_manual_egui,
          })

          _indexId = _id
        }

        var _applyId = _ns_document_type + ':' + _ns_document_number + ','
        var _relate_number = subListObj.getSublistValue({
          id: 'customer_voucher_relate_number',
          line: _index,
        })
        if (stringutility.trim(_relate_number).indexOf(_applyId) == -1) {
          subListObj.setSublistValue({
            id: 'customer_voucher_relate_number',
            line: _index,
            value: stringutility.trimOrAppendBlank(
              stringutility.trim(_relate_number) + _applyId
            ),
          })
        }
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
    //客戶代碼 search.Type.CUSTOMER
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
    //單據狀態
    var _selectUploadStatus = form.addField({
      id: 'custpage_select_voucher_upload_status',
      type: serverWidget.FieldType.SELECT,
      label: '上傳狀態',
    })
    _selectUploadStatus.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectUploadStatus.addSelectOption({
      value: 'A',
      text: '待上傳',
    })
    _selectUploadStatus.addSelectOption({
      value: 'P',
      text: '上傳中',
    })
    _selectUploadStatus.addSelectOption({
      value: 'C',
      text: '開立成功',
    })
    _selectUploadStatus.addSelectOption({
      value: 'E',
      text: '開立失敗',
    })
    _selectUploadStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //Invoice單據類別
    var _selectVoucherType = form.addField({
      id: 'custpage_select_document_type',
      type: serverWidget.FieldType.SELECT,
      label: 'NS 單據類別',
    })
    _selectVoucherType.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectVoucherType.addSelectOption({
      value: 'INVOICE',
      text: 'INVOICE',
    })
    _selectVoucherType.addSelectOption({
      value: 'CREDITMEMO',
      text: 'CREDIT MEMO',
    })
    _selectVoucherType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    var _document_no = form.addField({
      id: 'custpage_select_document_no',
      type: serverWidget.FieldType.TEXT,
      label: 'NS 單據編號',
    })
    _document_no.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //EGUI單據類別
    var _voucher_type = form.addField({
      id: 'custpage_select_voucher_type',
      type: serverWidget.FieldType.SELECT,
      label: '憑證類別',
    })
    _voucher_type.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _voucher_type.addSelectOption({
      value: 'EGUI',
      text: 'e-GUI',
    })
    _voucher_type.addSelectOption({
      value: 'ALLOWANCE',
      text: 'ALLOWANCE',
    })
    _voucher_type.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //EGUI單據號碼
    var _voucher_number = form.addField({
      id: 'custpage_select_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '憑證號碼 #',
    })
    _voucher_number.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //單據日期
    var _tran_start_date = form.addField({
      id: 'custpage_select_transtartdate',
      type: serverWidget.FieldType.DATE,
      label: '開始日期',
    })
    _tran_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    var _tran_end_date = form.addField({
      id: 'custpage_select_tranenddate',
      type: serverWidget.FieldType.DATE,
      label: '結束日期',
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
      label: '錯誤憑證-清單',
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
      id: 'customer_voucher_type',
      type: serverWidget.FieldType.TEXT,
      label: '憑證類別',
    })
    _sublist.addField({
      id: 'customer_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: '憑證號碼 #',
    })
    _sublist.addField({
      id: 'customer_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: '憑證日期',
    })
    _sublist.addField({
      id: 'customer_voucher_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Inv/CM #',
    })
    _sublist.addField({
      id: 'customer_voucher_buyer',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司',
    })
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
      id: 'customer_voucher_upload_status_desc',
      type: serverWidget.FieldType.TEXT,
      label: '上傳狀態',
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
    _sublist.addField({
      id: 'customer_voucher_manual_egui',
      type: serverWidget.FieldType.TEXT,
      label: '是否手開發票',
    })
    _sublist.addField({
      id: 'customer_voucher_isprinted',
      type: serverWidget.FieldType.TEXT,
      label: '已列印',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    ////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '錯誤憑證-清單',
    })
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
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    form.clientScriptModulePath = './gw_egui_common_ui_event.js'
    context.response.writePage(form)

    if (context.request.method === 'POST') {
      //Open Document 
      var _buttonType = context.request.parameters.custpage_hiddent_buttontype
      var _voucher_list_id =
        context.request.parameters.custpage_voucher_hiddent_listid
      log.debug('_buttonType: ', _buttonType)

      var _scriptObj = runtime.getCurrentScript()
      var _scriptId = _scriptObj.id
      var _deploymentId = _scriptObj.deploymentId
      log.debug('ScriptId Id: ', _scriptId)
      log.debug('Deployment Id: ', _deploymentId)
      if (
        stringutility.trim(_buttonType) === 'printPaper' ||
        stringutility.trim(_buttonType) === 'printPDF'
      ) {
        //列印Paper , PDF
        var _userObj = runtime.getCurrentUser()
        var _arrParams = {
          forwardscriptId: _scriptId,
          forwarddeploymentId: _deploymentId,
          userId: _userObj.id,
          userName: _userObj.name,
          voucher_type: 'EGUI',
          taskType: _buttonType,
          voucher_list_id: _voucher_list_id,
        }

        redirect.toSuitelet({
          scriptId: _gwVoucherGenxmlScriptId,
          deploymentId: _gwVoucherGenxmlDeployId,
          parameters: _arrParams,
        })
      }

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
      var _select_document_type =
        context.request.parameters.custpage_select_document_type
      var _select_document_no =
        context.request.parameters.custpage_select_document_no
      var _select_voucher_upload_status =
        context.request.parameters.custpage_select_voucher_upload_status
      var _select_voucher_type =
        context.request.parameters.custpage_select_voucher_type

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

      var _voucherTypeField = form.getField({
        id: 'custpage_select_voucher_type',
      })
      _voucherTypeField.defaultValue = _select_voucher_type

      var _transtartdateField = form.getField({
        id: 'custpage_select_transtartdate',
      })
      _transtartdateField.defaultValue = _select_transtartdate
      var _tranenddateField = form.getField({
        id: 'custpage_select_tranenddate',
      })
      _tranenddateField.defaultValue = _select_tranenddate

      var _documentTypeField = form.getField({
        id: 'custpage_select_document_type',
      })
      _documentTypeField.defaultValue = _select_document_type
      var _documentNoField = form.getField({
        id: 'custpage_select_document_no',
      })
      _documentNoField.defaultValue = _select_document_no
      var _voucherUploadStatusField = form.getField({
        id: 'custpage_select_voucher_upload_status',
      })
      _voucherUploadStatusField.defaultValue = _select_voucher_upload_status
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get Invoice LIST _invoiceSubList
      var _voucher_type = 'EGUI'
      searchVoucherList(
        form,
        _invoiceSubList,
        _voucher_type,
		_select_businessno,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_voucher_upload_status,
        _select_voucher_number,
        _select_transtartdate,
        _select_tranenddate,
        _select_document_type,
        _select_document_no
      )
      //search result end
      //end access file
    }
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
