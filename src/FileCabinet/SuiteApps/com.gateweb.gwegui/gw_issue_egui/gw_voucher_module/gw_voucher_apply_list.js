/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/record',
  'N/redirect',
  'N/encode',
  'N/search',
  'N/redirect',
  'N/format',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_lib_sl_utility'
], function (
  runtime,
  serverWidget,
  record,
  redirect,
  encode,
  search,
  redirect,
  format,
  invoiceutility,
  stringutility,
  gwLibSuiteLetUtility
) {
  var invoiceEditScriptId = 'customscript_gw_invoice_ui_edit'
  var invoiceEditDeployId = 'customdeploy_gw_invoice_ui_e'

  var searchVoucherRecordID = 'customrecord_gw_voucher_apply_list'

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

  function getBan(customerId) {
    var _vatregnumber = ''
    var _customerRecord = record.load({
      type: record.Type.CUSTOMER,
      id: parseInt(customerId),
      isDynamic: true,
    })
    _vatregnumber = _customerRecord.getValue({
      fieldId: 'custentity_gw_tax_id_number',
    })

    return stringutility.trim(_vatregnumber)
  }

  function convertDateToYYYYMMDD(userDate) {
    var _formattedDate = format.format({
      value: userDate,
      type: format.Type.DATETIMETZ,
    })
    //var _date = userDate.substr(6,4) + userDate.substr(0,2) + userDate.substr(3,2);
    return _formattedDate.toString()
  }

  function searchVoucher(
    form,
    subListObj,
	business_no,
    customerid,
    deptcode,
    classification,
    startdate,
    enddate
  ) {
    var _mySearch = search.create({
      type: searchVoucherRecordID,
      columns: [
        'custrecord_gw_voucher_apply_date',
        'custrecord_gw_voucher_apply_time',
        'custrecord_gw_invoice_document_no',
        'custrecord_gw_creditmemo_document_no',
        'custrecord_gw_voucher_void_comment',
        'custrecord_gw_voucher_flow_status',
        'custrecord_gw_voucher_approve_comment',
      ],
    })

    var _filterArray = []
    _filterArray.push(['custrecord_gw_closed_voucher', 'is', 'N']) //Y:不顯示資料 , N:顯示
    _filterArray.push('and')
    _filterArray.push(['custrecord_gw_voucher_apply_type', 'is', 'CANCEL'])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_flow_status',
      'is',
      'CANCEL_ISSUE',
    ])

    if (business_no != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_apply_seller',
        search.Operator.IS,
        business_no,
      ])
    }
    if (customerid != '') {
      //TODO 要抓統編
      var _account_number = getBan(customerid)
      if (_account_number != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_apply_buyer',
          'is',
          _account_number,
        ])
      }
    }
    if (deptcode != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_apply_dept_code',
        'is',
        deptcode,
      ])
    }
    if (classification != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_apply_class',
        'is',
        classification,
      ])
    }
    if (startdate != '') {
      var _formattedDate = format.format({
        value: startdate,
        type: format.Type.DATETIMETZ,
      })

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_apply_date',
        'onOrAfter',
        _formattedDate,
      ])
    }
    if (enddate != '') {
      var _formattedDate = format.format({
        value: enddate,
        type: format.Type.DATETIMETZ,
      })

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_apply_date',
        'onOrBefore',
        _formattedDate,
      ])
    }
    _mySearch.filterExpression = _filterArray
    ///////////////////////////////////////////////////////////////////////////////////
    //處理結果
    var _index = 0
    var _pagedData = _mySearch.runPaged({
      pageSize: 1000,
    })
    for (var i = 0; i < _pagedData.pageRanges.length; i++) {
      var _currentPage = _pagedData.fetch(i)
      _currentPage.data.forEach(function (result) {
        var _internalid = result.id
        subListObj.setSublistValue({
          id: 'customer_search_voucher_id',
          line: _index,
          value: _internalid,
        })

        var _voucher_apply_date = result.getValue({
          name: 'custrecord_gw_voucher_apply_date',
        })
        var _voucher_apply_time = result.getValue({
          name: 'custrecord_gw_voucher_apply_time',
        })
        //發票號碼(INVOICE+CUSTOMER_DEPOSIT)
        var _invoice_document_no = result.getValue({
          name: 'custrecord_gw_invoice_document_no',
        })
        var _creditmemo_document_no = result.getValue({
          name: 'custrecord_gw_creditmemo_document_no',
        })
        var _voucher_void_comment = result.getValue({
          name: 'custrecord_gw_voucher_void_comment',
        })
        var _voucher_approve_comment = result.getValue({
          name: 'custrecord_gw_voucher_approve_comment',
        })
        var _voucher_flow_status = result.getValue({
          name: 'custrecord_gw_voucher_flow_status',
        })

        //設值
        subListObj.setSublistValue({
          id: 'customer_voucher_tranid',
          line: _index,
          value: _internalid,
        })
        subListObj.setSublistValue({
          id: 'customer_voucher_apply_date',
          line: _index,
          value: convertDateToYYYYMMDD(_voucher_apply_date),
        })
        subListObj.setSublistValue({
          id: 'customer_voucher_apply_time',
          line: _index,
          value: _voucher_apply_time,
        })

        subListObj.setSublistValue({
          id: 'customer_invoice_document_no',
          line: _index,
          value: stringutility.trimOrAppendBlank(_invoice_document_no),
        })
        subListObj.setSublistValue({
          id: 'customer_creditmemo_document_no',
          line: _index,
          value: stringutility.trimOrAppendBlank(_creditmemo_document_no),
        })
        subListObj.setSublistValue({
          id: 'customer_voucher_void_comment',
          line: _index,
          value: stringutility.trimOrAppendBlank(_voucher_void_comment),
        })
        subListObj.setSublistValue({
          id: 'customer_voucher_flow_status',
          line: _index,
          value: invoiceutility.getVoucherStatusDesc(
            stringutility.trimOrAppendBlank(_voucher_flow_status)
          ),
        })

        _index++
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
      source: 'customer',
      label: '買方公司',
    })
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

    //申請日期
    var _apply_start_date = form.addField({
      id: 'custpage_select_apply_startdate',
      type: serverWidget.FieldType.DATE,
      label: '開始日期',
    })
    _apply_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    var _apply_end_date = form.addField({
      id: 'custpage_select_apply_enddate',
      type: serverWidget.FieldType.DATE,
      label: '結束日期',
    })
    _apply_end_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
  }

  //憑證明細
  function createVoucherApplySubList(form) {
    var _sublist = form.addSublist({
      id: 'vouchersublistid',
      type: serverWidget.SublistType.LIST,
      label: '作廢(發票-折讓單)審核作業',
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
      label: 'SELECT',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.NORMAL,
    })
    /////////////////////////////////////////////////////////////////////////////
    //處理顯示欄位
    _sublist.addField({
      id: 'customer_voucher_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'internal ID',
    })
    _sublist.addField({
      id: 'customer_voucher_apply_date',
      type: serverWidget.FieldType.TEXT,
      label: '申請日期',
    })
    _sublist.addField({
      id: 'customer_voucher_apply_time',
      type: serverWidget.FieldType.TEXT,
      label: '申請時間',
    })
    _sublist.addField({
      id: 'customer_invoice_document_no',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI #',
    })
    _sublist.addField({
      id: 'customer_creditmemo_document_no',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI CM #',
    })
    _sublist.addField({
      id: 'customer_voucher_void_comment',
      type: serverWidget.FieldType.TEXT,
      label: 'Reason',
    })
    _sublist.addField({
      id: 'customer_voucher_flow_status',
      type: serverWidget.FieldType.TEXT,
      label: '狀態',
    })

    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    ////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '作廢(發票-折讓單)審核清單',
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
    //紀錄 Voucher selected
    var _hidden_invoice_listld = form.addField({
      id: 'custpage_voucher_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_invoice_listld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    ////////////////////////////////////////////////////////////////////////////
    createForm(form)

    var _invoiceSubList = createVoucherApplySubList(form)

    form.addButton({
      id: 'custpage_approve_document_button',
      label: '同意',
      functionName: 'submitApprove("CANCEL_APPROVE")',
    })
    form.addButton({
      id: 'custpage_reject_document_button',
      label: '不同意',
      functionName: 'submitApprove("CANCEL_REJECT")',
    })
    form.addButton({
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    form.clientScriptModulePath = './gw_voucher_apply_ui_event.js'
    context.response.writePage(form)

    if (context.request.method === 'POST') {
      //Open Document
      var _buttonType = context.request.parameters.custpage_hiddent_buttontype
      var _invoice_hiddent_listId =
        context.request.parameters.custpage_invoice_hiddent_listid

      //search
	  var _select_businessno =
            context.request.parameters.custpage_businessno  
      var _selectcustomerid =
        context.request.parameters.custpage_selectcustomerid
      var _select_deptcode = context.request.parameters.custpage_select_deptcode
      var _select_classification =
        context.request.parameters.custpage_select_classification
      var _select_apply_startdate =
        context.request.parameters.custpage_select_apply_startdate
      var _select_apply_enddate =
        context.request.parameters.custpage_select_apply_enddate
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_select_businessno) return
      var _businessnoField = form.getField({
        id: 'custpage_businessno',
      })
      _businessnoField.defaultValue = _select_businessno
	  var _customeridField = form.getField({
        id: 'custpage_selectcustomerid',
      })
      _customeridField.defaultValue = _selectcustomerid

      var _deptcodeField = form.getField({
        id: 'custpage_select_deptcode',
      })
      _deptcodeField.defaultValue = _select_deptcode

      var _classificationField = form.getField({
        id: 'custpage_select_classification',
      })
      _classificationField.defaultValue = _select_classification

      var _applyStartdateField = form.getField({
        id: 'custpage_select_apply_startdate',
      })
      _applyStartdateField.defaultValue = _select_apply_startdate

      var _applyEnddateField = form.getField({
        id: 'custpage_select_apply_enddate',
      })
      _applyEnddateField.defaultValue = _select_apply_enddate
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get Invoice LIST _invoiceSubList
      searchVoucher(
        form,
        _invoiceSubList,
		_select_businessno,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_apply_startdate,
        _select_apply_enddate
      )
      //search result end
    }
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
