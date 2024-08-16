/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/config',
  'N/record',
  'N/search',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_lib_sl_utility'
], function (
  runtime,
  serverWidget,
  config,
  record,
  search,
  dateutility,
  invoiceutility,
  stringutility,
  gwconfigure,
  gwLibSuiteLetUtility
) {
  //之後設成Script的Parameters
  var _assignLogImportScriptId = gwconfigure.getGwAssignLogImportScriptId()
  var _assignLogImportDeploymentId = gwconfigure.getGwAssignLogImportDeploymentId()

  var _assignLogManualScriptId = gwconfigure.getGwAssignLogManualScriptId()
  var _assignLogManualDeploymentId = gwconfigure.getGwAssignLogManualDeploymentId()

  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()

  function getStatusName(id) {
    var name = ''
    if (id == '11') {
      name = '一般字軌-未使用'
    } else if (id == '12') {
      name = '一般字軌-使用中'
    } else if (id == '13') {
      name = '一般字軌-已使用完畢'
    } else if (id == '14') {
      name = '一般字軌-作廢'
    }
    if (id == '21') {
      name = '歷史發票字軌-未使用'
    } else if (id == '22') {
      name = '歷史發票字軌-使用中'
    } else if (id == '23') {
      name = '歷史發票字軌-已使用完畢'
    } else if (id == '24') {
      name = '歷史發票字軌-作廢'
    }
    if (id == '31') {
	    name = '外部發票字軌-未使用'
	} else if (id == '32') {
	    name = '外部發票字軌-使用中'
	} else if (id == '33') {
	    name = '外部發票字軌-已使用完畢'
	} else if (id == '34') {
	    name = '外部發票字軌-作廢'
	}
    return name
  }
  
  function padding(str, length) {
    return (Array(length).join('0') + str).slice(-length)
  }

  function createForm(form) {
    //Load company Information
    var _companyInfo = config.load({
      type: config.Type.COMPANY_INFORMATION,
    })
    var _taxid = _companyInfo.getValue({
      fieldId: 'taxid',
    })
    var _companyname = _companyInfo.getValue({
      fieldId: 'companyname',
    })
    //暫借欄位做統編
    var _ban = _companyInfo.getValue({
      fieldId: 'employerid',
    })
    var _legalname = _companyInfo.getValue({
      fieldId: 'legalname',
    })

    log.debug(
      'assign taxid',
      '_ban=' + _ban + '  ,_companyname=' + _companyname
    )

    //Hiddent Element
    var _hiddenfield = form.addField({
      id: 'custpage_hiddent_buttontype',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hiddenfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //Hiddent Element
    var _hiddenlistld = form.addField({
      id: 'custpage_assignlog_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hiddenlistld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    ///////////////////////////////////////////////////////////////////////////////////
    //查詢條件
    //公司別
    var _selectBusinessNo = form.addField({
      id: 'custpage_businessno',
      type: serverWidget.FieldType.SELECT,
      label: '統一編號',
    })
    _selectBusinessNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    /**
    _selectBusinessNo.addSelectOption({
      value: _ban,
      text: _legalname,
    })
    */
    ////////////////////////////////////////////////////////////////////////////
    var currentUserObject = runtime.getCurrentUser()
    var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
    gwLibSuiteLetUtility.addBusinessEntitySelectOption(_company_ary, _selectBusinessNo)
    ////////////////////////////////////////////////////////////////////////////

    //期別
    var _yearmonth_field = form.addField({
      id: 'custpage_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '年月',
    })
    _yearmonth_field.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //查詢狀態
    var _selectStatus = form.addField({
      id: 'custpage_status',
      type: serverWidget.FieldType.SELECT,
      label: '狀態 *',
    })
    _selectStatus.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectStatus.addSelectOption({
      value: '11',
      text: '一般字軌-未使用',
    })
    _selectStatus.addSelectOption({
      value: '12',
      text: '一般字軌-使用中',
    })
    _selectStatus.addSelectOption({
      value: '13',
      text: '一般字軌-已使用完畢',
    })
    _selectStatus.addSelectOption({
      value: '14',
      text: '一般字軌-作廢',
    })
    
    _selectStatus.addSelectOption({
      value: '21',
      text: '歷史發票字軌-未使用',
    })
    _selectStatus.addSelectOption({
      value: '22',
      text: '歷史發票字軌-使用中',
    })
    _selectStatus.addSelectOption({
      value: '23',
      text: '歷史發票字軌-已使用完畢',
    })
    _selectStatus.addSelectOption({
      value: '24',
      text: '歷史發票字軌-作廢',
    })
    
    _selectStatus.addSelectOption({
      value: '31',
      text: '外部發票字軌-未使用',
    })
    _selectStatus.addSelectOption({
      value: '32',
      text: '外部發票字軌-使用中',
    })
    _selectStatus.addSelectOption({
      value: '33',
      text: '外部發票字軌-已使用完畢',
    })
    _selectStatus.addSelectOption({
      value: '34',
      text: '外部發票字軌-作廢',
    })
    _selectStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_select_deptcode',
      type: serverWidget.FieldType.SELECT,
      label: '部門 *',
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
        var internalid = result.getValue({
          name: 'internalid',
        })
        var deptname = result.getValue({
          name: 'name',
        })

        _selectDeptCode.addSelectOption({
          value: internalid,
          text: deptname,
        })
        return true
      })

    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_select_classification',
      type: serverWidget.FieldType.SELECT,
      label: '分類 *',
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
        var internalid = result.getValue({
          name: 'internalid',
        })
        var deptname = result.getValue({
          name: 'name',
        })

        _selectClassification.addSelectOption({
          value: internalid,
          text: deptname,
        })
        return true
      })

    //作廢理由
    var _voidreason = form.addField({
      id: 'custpage_assignlog_reason',
      type: serverWidget.FieldType.TEXT,
      label: '作廢理由 *',
    })
    _voidreason.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    ///////////////////////////////////////////////////////////////////////////////////
    //Sub List Items
    ///////////////////////////////////////////////////////////////////////////////////
    var _sublist = form.addSublist({
      id: 'assignlogsublistid',
      type: serverWidget.SublistType.LIST,
      label: '字軌清單',
    })

    _sublist.addButton({
      id: 'buttonid_mark',
      label: 'Mark All',
      functionName:
        'mark(true,"assignlogsublistid","customer_search_assignlog_id","customer_search_assignlog_check_id")',
    })

    _sublist.addButton({
      id: 'buttonid_unmark',
      label: 'Unmark All',
      functionName:
        'mark(false,"assignlogsublistid","customer_search_assignlog_id","customer_search_assignlog_check_id")',
    })

    var _statusField = _sublist.addField({
      id: 'customer_selected_assignlog_status',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _statusField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _deptcodeField = _sublist.addField({
      id: 'customer_selected_assignlog_deptcode',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _deptcodeField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _classificationField = _sublist.addField({
      id: 'customer_selected_assignlog_classification',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _classificationField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var idField = _sublist.addField({
      id: 'customer_search_assignlog_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _checkboxfield = _sublist.addField({
      id: 'customer_search_assignlog_check_id',
      type: serverWidget.FieldType.CHECKBOX,
      label: '順序',
    })

    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })

    _sublist.addField({
      id: 'invoicetype',
      type: serverWidget.FieldType.TEXT,
      label: '發票類型',
    })
    _sublist.addField({
      id: 'assignlogdeptcode',
      type: serverWidget.FieldType.TEXT,
      label: '部門',
    })
    _sublist.addField({
      id: 'assignlogclassfication',
      type: serverWidget.FieldType.TEXT,
      label: '分類',
    })
    _sublist.addField({
      id: 'invoiceperiod',
      type: serverWidget.FieldType.TEXT,
      label: '年月',
    })
    _sublist.addField({
      id: 'trackno',
      type: serverWidget.FieldType.TEXT,
      label: '字軌',
    })
    _sublist.addField({
      id: 'startno',
      type: serverWidget.FieldType.TEXT,
      label: '起號',
    })
    _sublist.addField({
      id: 'endno',
      type: serverWidget.FieldType.TEXT,
      label: '迄號',
    })
    _sublist.addField({
      id: 'usedcount',
      type: serverWidget.FieldType.TEXT,
      label: '已使用張數',
    })
    _sublist.addField({
      id: 'status',
      type: serverWidget.FieldType.TEXT,
      label: '狀態',
    }) 
    _sublist.addField({
      id: 'lastinvoicedate',
      type: serverWidget.FieldType.TEXT,
      label: '最後使用日期',
    })
    _sublist.addField({
      id: 'assignloglastinvnumber',
      type: serverWidget.FieldType.TEXT,
      label: '最後使用號碼',
    })
    _sublist.addField({
      id: 'reason',
      type: serverWidget.FieldType.TEXT,
      label: '作廢理由',
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //Sub List Items
    ///////////////////////////////////////////////////////////////////////////////////
    form.addButton({
      id: 'custpage_import_assignlog_button',
      label: '匯入-電子發票字軌',
      functionName:
        'openImportForm("' +
        _assignLogImportScriptId +
        '","' +
        _assignLogImportDeploymentId +
        '")',
    })

    form.addButton({
      id: 'custpage_manual_assignlog_button',
      label: '維護-外部及歷史發票字軌',
      functionName:
        'openImportForm("' +
        _assignLogManualScriptId +
        '","' +
        _assignLogManualDeploymentId +
        '")',
    })

    form.addButton({
      id: 'custpage_search_assignlog_button',
      label: '查詢',
      functionName: 'searchAssignLogs()',
    })

    //status, yearMonth, deptCode
    form.addButton({
      id: 'custpage_save_assignlog_button',
      label: '存檔',
      functionName: 'saveAssignLogs()',
    })

    form.clientScriptModulePath = './gw_assignlog_ui_event.js'

    return _sublist
  }

  function onRequest(context) {
    var form = serverWidget.createForm({
      title: '字軌管理',
    })

    var _sublist = createForm(form)
    context.response.writePage(form)

    var _buttontype = context.request.parameters.custpage_hiddent_buttontype

    if (context.request.method === 'POST') {
      //search
      var _businessNo = context.request.parameters.custpage_businessno
      var _yearMonth = context.request.parameters.custpage_year_month
      var _selectStatus = context.request.parameters.custpage_status
      var _selectDeptCode = context.request.parameters.custpage_select_deptcode
      var _selectClassification =
        context.request.parameters.custpage_select_classification
      var _assignlog_hiddent_listId =
        context.request.parameters.custpage_assignlog_hiddent_listid
      var _assignlog_reason =
        context.request.parameters.custpage_assignlog_reason

      //////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_businessNo) return
      var _businessNoField = form.getField({
        id: 'custpage_businessno',
      })
      _businessNoField.defaultValue = _businessNo
      var _yearMonthField = form.getField({
        id: 'custpage_year_month',
      })
      _yearMonthField.defaultValue = _yearMonth
      var _status = form.getField({
        id: 'custpage_status',
      })
      _status.defaultValue = _selectStatus
      var _select_deptcode = form.getField({
        id: 'custpage_select_deptcode',
      })
      _select_deptcode.defaultValue = _selectDeptCode
      var _select_classification = form.getField({
        id: 'custpage_select_classification',
      })
      _select_classification.defaultValue = _selectClassification
      //////////////////////////////////////////////////////////////////////////////////////////////////

      //取得部門及類別名稱
      var _selectDeptName = ''
      var _selectClassName = ''
      if (_selectDeptCode != '') {
        var _record = record.load({
          type: record.Type.DEPARTMENT,
          id: _selectDeptCode,
          isDynamic: true,
        })
        _selectDeptName = _record.getValue({
          fieldId: 'name',
        })
      }
      //類別
      if (_selectClassification != '') {
        var _record = record.load({
          type: record.Type.CLASSIFICATION,
          id: _selectClassification,
          isDynamic: true,
        })
        _selectClassName = _record.getValue({
          fieldId: 'name',
        })
      }
      //search and save

      /////////////////////////////////////////////////////////////////////////////////////////////////////
      //search result start
      var _mySearch = search.create({
        type: _assignLogRecordId,
        columns: [
          'internalid',
          'name',
          'custrecord_gw_assignlog_businessno',
          'custrecord_gw_assignlog_deptcode',
          'custrecord_gw_assignlog_deptname',
          'custrecord_gw_assignlog_classification',
          'custrecord_gw_assignlog_class_name',
          'custrecord_gw_assignlog_invoicetype',
          'custrecord_gw_assignlog_invoicetrack',
          'custrecord_gw_assignlog_startno',
          'custrecord_gw_assignlog_endno',
          'custrecord_gw_assignlog_yearmonth',
          'custrecord_gw_assignlog_status',
          'custrecord_gw_assignlog_taketime',
          'custrecord_gw_assignlog_lastinvnumbe',
          'custrecord_gw_assignlog_reason',
          'custrecord_gw_assignlog_usedcount',
          'custrecord_gw_assignlog_version',
          'custrecord_gw_last_invoice_date'
        ],
      })

      var filterArray = []
      filterArray.push(['custrecord_gw_assignlog_businessno', 'isnot', 'X'])

      if (_businessNo != '') {
        filterArray.push('and')
        filterArray.push([
          'custrecord_gw_assignlog_businessno',
          'is',
          _businessNo,
        ])
      }
      if (_selectDeptCode != '') {
        filterArray.push('and')
        filterArray.push([
          'custrecord_gw_assignlog_deptcode',
          'is',
          _selectDeptCode,
        ])
      }
      if (_selectClassification != '') {
        filterArray.push('and')
        filterArray.push([
          'custrecord_gw_assignlog_classification',
          'is',
          _selectClassification,
        ])
      }
      if (_yearMonth != '') {
        filterArray.push('and')
        filterArray.push([
          'custrecord_gw_assignlog_yearmonth',
          'is',
          _yearMonth,
        ])
      }
      if (_selectStatus != '') {
        filterArray.push('and')
        filterArray.push([
          'custrecord_gw_assignlog_status',
          'is',
          _selectStatus,
        ])
      }
      _mySearch.filterExpression = filterArray
      log.debug('filterArray', filterArray)

      var _index = 0
      var _pagedData = _mySearch.runPaged({
        pageSize: 1000,
      })
      for (var i = 0; i < _pagedData.pageRanges.length; i++) {
        var _currentPage = _pagedData.fetch(i)
        _currentPage.data.forEach(function (result) {
          var internalid = result.id

          var _businessno = result.getValue({
            name: 'custrecord_gw_assignlog_businessno',
          })
          var _deptCode = result.getValue({
            name: 'custrecord_gw_assignlog_deptcode',
          })
          var _deptName = result.getValue({
            name: 'custrecord_gw_assignlog_deptname',
          })
          var _classfication = result.getValue({
            name: 'custrecord_gw_assignlog_classification',
          })
          var _className = result.getValue({
            name: 'custrecord_gw_assignlog_class_name',
          })
          var _invoiceType = result.getValue({
            name: 'custrecord_gw_assignlog_invoicetype',
          })
          var _invoiceTrack = result.getValue({
            name: 'custrecord_gw_assignlog_invoicetrack',
          })
          var _startNo = result.getValue({
            name: 'custrecord_gw_assignlog_startno',
          })
          var _endNo = result.getValue({
            name: 'custrecord_gw_assignlog_endno',
          })
          var _yearMonth = result.getValue({
            name: 'custrecord_gw_assignlog_yearmonth',
          })
          var _status = result.getValue({
            name: 'custrecord_gw_assignlog_status',
          })
          var _reason = result.getValue({
            name: 'custrecord_gw_assignlog_reason',
          })
          var _usedcount = result.getValue({
            name: 'custrecord_gw_assignlog_usedcount',
          })
          
          var _last_invoice_date = result.getValue({
            name: 'custrecord_gw_last_invoice_date',
          })
          var _assignlog_lastinvnumbe = result.getValue({
            name: 'custrecord_gw_assignlog_lastinvnumbe',
          })
          if (_assignlog_lastinvnumbe!='')_assignlog_lastinvnumbe = padding('' + _assignlog_lastinvnumbe, 8)
          
          //序號	internalid	 customer_search_assignlog_check_id
          _sublist.setSublistValue({
            id: 'assignloglastinvnumber',
            line: _index,
            value: stringutility.trimOrAppendBlank(_assignlog_lastinvnumbe),
          })
          
          _sublist.setSublistValue({
            id: 'lastinvoicedate',
            line: _index,
            value: stringutility.trimOrAppendBlank(_last_invoice_date),
          })
          
          _sublist.setSublistValue({
            id: 'customer_search_assignlog_id',
            line: _index,
            value: internalid,
          })

          _sublist.setSublistValue({
            id: 'customer_search_assignlog_check_id',
            line: _index,
            value: 'F',
          })

          //發票類型
          var _invoiceTypeName =
            _invoiceType + '-' + invoiceutility.getInvoiceTypeDesc(_invoiceType)
          _sublist.setSublistValue({
            id: 'invoicetype',
            line: _index,
            value: _invoiceTypeName,
          })
          //部門
          _sublist.setSublistValue({
            id: 'assignlogdeptcode',
            line: _index,
            value: _deptCode + '-' + _deptName,
          })
          _sublist.setSublistValue({
            id: 'customer_selected_assignlog_deptcode',
            line: _index,
            value: stringutility.trimOrAppendBlank(_deptCode),
          })

          //類別
          _sublist.setSublistValue({
            id: 'assignlogclassfication',
            line: _index,
            value: _classfication + '-' + _className,
          })
          _sublist.setSublistValue({
            id: 'customer_selected_assignlog_classification',
            line: _index,
            value: stringutility.trimOrAppendBlank(_classfication),
          })
          //期別
          _sublist.setSublistValue({
            id: 'invoiceperiod',
            line: _index,
            value: _yearMonth,
          })
          //字軌
          _sublist.setSublistValue({
            id: 'trackno',
            line: _index,
            value: _invoiceTrack,
          })
          //起號
          _sublist.setSublistValue({
            id: 'startno',
            line: _index,
            value: stringutility.padding('' + _startNo, 8),
          })
          //迄號
          _sublist.setSublistValue({
            id: 'endno',
            line: _index,
            value: stringutility.padding('' + _endNo, 8),
          })
          //使用張數
          _sublist.setSublistValue({
            id: 'usedcount',
            line: _index,
            value: stringutility.trimOrAppendBlank(_usedcount),
          })
          //狀態

          var _statusName = _status + '-' + getStatusName(_status)

          _sublist.setSublistValue({
            id: 'status',
            line: _index,
            value: _statusName,
          })
          _sublist.setSublistValue({
            id: 'customer_selected_assignlog_status',
            line: _index,
            value: stringutility.trimOrAppendBlank(_status),
          })
          //作廢理由
          if (_reason != '') {
            _sublist.setSublistValue({
              id: 'reason',
              line: _index,
              value: _reason,
            })
          }
          _index++
        })
      }
    }
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
