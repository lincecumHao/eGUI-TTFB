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
  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()

  function getFormatCodeName(id) {
    var _text = ''
    if (id == '31-SP3-50-01') {
      _text = '31-銷項三聯式[裝訂數:50張]'
    } else if (id == '31-SE0-50-05') {
      _text = '31-銷項電子計算機統一發票[裝訂數:50張]'
    } else if (id == '32-SP2-50-02') {
      _text = '32-銷項二聯式[裝訂數:50張]'
    } else if (id == '32-SC2-250-03') {
      _text = '32-銷項二聯式收銀機統一發票[裝訂數:250張]'
    } else if (id == '35-SC3-250-06') {
      _text = '35-銷項三聯式收銀機統一發票[裝訂數:250張]'
    } else if (id == '35-SE0-50-07') {
      _text = '35-一般稅額電子發票[裝訂數:50張]'
    }

    return _text
  }

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

    //格式代號
    //31格式：50張，包含三聯式及電子計算機發票
    //32格式：二聯式50張，二聯式收銀機發票250張
    //35格式：250張，三聯式收銀機發票
    var _eguiFormatCode = form.addField({
      id: 'custpage_egui_format_code',
      type: serverWidget.FieldType.SELECT,
      label: '格式代號 *',
    })
    _eguiFormatCode.addSelectOption({
      value: '31-SP3-50-01',
      text: '31-銷項三聯式[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '31-SE0-50-05',
      text: '31-銷項電子計算機統一發票[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '32-SP2-50-02',
      text: '32-銷項二聯式[裝訂數:50張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '32-SC2-250-03',
      text: '32-銷項二聯式收銀機統一發票[裝訂數:250張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '35-SC3-250-06',
      text: '35-銷項三聯式收銀機統一發票[裝訂數:250張]',
    })
    _eguiFormatCode.addSelectOption({
      value: '35-SE0-50-07',
      text: '35-一般稅額電子發票[裝訂數:50張]',
    })
    _eguiFormatCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //期別
    var _yearmonth_field = form.addField({
      id: 'custpage_track_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '年月',
    })
    _yearmonth_field.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //字軌
    var _selectInvoiceTrack = form.addField({
      id: 'custpage_select_invoice_track',
      type: serverWidget.FieldType.SELECT,
      label: '字軌 *',
    })
    _selectInvoiceTrack.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectInvoiceTrack.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //起始號碼
    var _startInvoiceNo = form.addField({
      id: 'custpage_start_invoiceno',
      type: serverWidget.FieldType.TEXT,
      label: '起始號碼 *',
    })
    _startInvoiceNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //截止號碼
    var _endInvoiceNo = form.addField({
      id: 'custpage_end_invoiceno',
      type: serverWidget.FieldType.TEXT,
      label: '截止號碼 *',
    })
    _endInvoiceNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    
    var _selectInvoiceType = form.addField({
      id: 'custpage_select_invoice_type',
      type: serverWidget.FieldType.SELECT,
      label: '字軌類型',
    })
    _selectInvoiceType.addSelectOption({
      value: '21',
      text: '歷史發票',
    })
    _selectInvoiceType.addSelectOption({
      value: '31',
      text: '外部發票',
    })
    _selectInvoiceType.updateLayoutType({
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
      id: 'eguiformatcode',
      type: serverWidget.FieldType.TEXT,
      label: '格式代號',
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
      id: 'custpage_delete_assignlog_button',
      label: '刪除',
      functionName: 'deleteManualSelected()',
    })

    form.addButton({
      id: 'custpage_save_assignlog_button',
      label: '存檔',
      functionName: 'saveManualAssignLogs()',
    })

    form.addButton({
      id: 'custpage_search_assignlog_button',
      label: '查詢',
      functionName: 'searchAssignLogs()',
    })

    form.clientScriptModulePath = './gw_assignlog_ui_event.js'

    return _sublist
  }

  function onRequest(context) {
    var form = serverWidget.createForm({
      title: '外部及歷史發票字軌管理',
    })

    var _sublist = createForm(form)
    context.response.writePage(form)

    var _buttontype = context.request.parameters.custpage_hiddent_buttontype

    if (context.request.method === 'POST') {
      //search
      var _businessNo = context.request.parameters.custpage_businessno
      var _yearMonth = context.request.parameters.custpage_track_year_month
      var _egui_format_code =
        context.request.parameters.custpage_egui_format_code
      var _invoice_track =
        context.request.parameters.custpage_select_invoice_track
      _invoice_track = stringutility.trim(_invoice_track)
      var _start_invoiceno = context.request.parameters.custpage_start_invoiceno
      var _end_invoiceno = context.request.parameters.custpage_end_invoiceno
      
      var _select_invoice_type = context.request.parameters.custpage_select_invoice_type
      
      //////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_businessNo) return
      var _businessNoField = form.getField({
        id: 'custpage_businessno',
      })
      _businessNoField.defaultValue = _businessNo

      var _yearMonthField = form.getField({
        id: 'custpage_track_year_month',
      })
      _yearMonthField.defaultValue = _yearMonth

      var _formatCodeField = form.getField({
        id: 'custpage_egui_format_code',
      })
      _formatCodeField.defaultValue = _egui_format_code

      var _invoiceTrackField = form.getField({
        id: 'custpage_select_invoice_track',
      })
      _invoiceTrackField.defaultValue = _invoice_track

      var _startInvoicenoField = form.getField({
        id: 'custpage_start_invoiceno',
      })
      _startInvoicenoField.defaultValue = _start_invoiceno

      var _endInvoicenoField = form.getField({
        id: 'custpage_end_invoiceno',
      })
      _endInvoicenoField.defaultValue = _end_invoiceno
      
      var _endInvoiceTypeField = form.getField({
          id: 'custpage_select_invoice_type',
        })
      _endInvoiceTypeField.defaultValue = _select_invoice_type
      //////////////////////////////////////////////////////////////////////////////////////////////////

      //////////////////////////////////////////////////////////////////////////////////////////////////
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
          'custrecord_gw_egui_format_code',
          'custrecord_gw_egui_format_name',
          'custrecord_gw_book_binding_count',
        ],
      })

      var _filterArray = []
      _filterArray.push(['custrecord_gw_assignlog_businessno', 'isnot', 'X'])

      if (_businessNo != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_businessno',
          'is',
          _businessNo,
        ])
      }
      if (_yearMonth != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_yearmonth',
          'is',
          _yearMonth,
        ])
      }
      if (_egui_format_code != '') {
        var _eguiFormatCodeAry = _egui_format_code.split('-')

        var _eguiFormatCode = _eguiFormatCodeAry[0]
        var _eguiFormatName = _eguiFormatCodeAry[1]
        var _eguiInvoiceType = _eguiFormatCodeAry[3]

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_egui_format_code',
          'is',
          _eguiFormatCode,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_egui_format_name',
          'is',
          _eguiFormatName,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_invoicetype',
          'is',
          _eguiInvoiceType,
        ])
      }
      if (_invoice_track != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_invoicetrack',
          'is',
          _invoice_track,
        ])
      }
      //search.Operator.GREATERTHANOREQUALTO search.Operator.LESSTHANOREQUALTO
      if (_start_invoiceno != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_startno',
          search.Operator.EQUALTO,
          stringutility.convertToFloat(_start_invoiceno),
        ])
        //_filterArray.push([['custrecord_gw_assignlog_startno',search.Operator.LESSTHANOREQUALTO, stringutility.convertToInt(_start_invoiceno)],'and',['custrecord_gw_assignlog_endno',search.Operator.GREATERTHANOREQUALTO, stringutility.convertToInt(_start_invoiceno)]]);
      }
      if (_end_invoiceno != '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_assignlog_endno',
          search.Operator.EQUALTO,
          stringutility.convertToFloat(_end_invoiceno),
        ])
        //_filterArray.push([['custrecord_gw_assignlog_startno',search.Operator.LESSTHANOREQUALTO, stringutility.convertToInt(_end_invoiceno)],'and',['custrecord_gw_assignlog_endno',search.Operator.GREATERTHANOREQUALTO, stringutility.convertToInt(_end_invoiceno)]]);
      }
      _mySearch.filterExpression = _filterArray
      //log.debug({title:"search _filterArray result", details:JSON.stringify(_filterArray)});
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
          //代碼
          var _gw_egui_format_code = result.getValue({
            name: 'custrecord_gw_egui_format_code',
          })
          //名稱
          var _gw_egui_format_name = result.getValue({
            name: 'custrecord_gw_egui_format_name',
          })
          //裝訂數
          var _gw_book_binding_count = result.getValue({
            name: 'custrecord_gw_book_binding_count',
          })
          var _format_code =
            _gw_egui_format_code +
            '-' +
            _gw_egui_format_name +
            '-' +
            _gw_book_binding_count +
            '-' +
            _invoiceType

          //序號	internalid	 customer_search_assignlog_check_id
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
          //格式代號
          log.debug('assign _format_code', _format_code)
          var _format_code_desc = getFormatCodeName(_format_code)
          _sublist.setSublistValue({
            id: 'eguiformatcode',
            line: _index,
            value: stringutility.trimOrAppendBlank(_format_code_desc),
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
