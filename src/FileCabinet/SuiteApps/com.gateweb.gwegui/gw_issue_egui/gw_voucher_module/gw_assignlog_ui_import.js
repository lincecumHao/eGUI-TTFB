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
  'N/file',
  'N/search',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_configure'
], function (
  runtime,
  serverWidget,
  config,
  record,
  file,
  search,
  invoiceutility,
  stringutility,
  gwconfigure
) {
  //Record
  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()
  var _assignLogSearchId = gwconfigure.getGwAssignLogSearchId()

  var _invoceFormatCode = gwconfigure.getGwVoucherFormatInvoiceCode() //35

  //字軌本數上限
  var _count_limit = 150

  //紀錄user的subsidary
  //20210427 walter 增加賣方公司 List
  function getUserSubsidaryTaxId() {
    var _user_subsidary_taxId_ary = []
    var currentUserObject = runtime.getCurrentUser()
    var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
    if (_company_ary !== null) {
      for (var i = 0; i < _company_ary.length; i++) {
        var eachCompanyObject = _company_ary[i];
        log.debug({title: 'getUserSubsidaryTaxId - eachCompanyObject', details: JSON.stringify(eachCompanyObject)})
        _user_subsidary_taxId_ary.push(eachCompanyObject.tax_id_number)
      }
    }
    return _user_subsidary_taxId_ary
  }

  //驗證欄位
  function verifyColumn(
    userSubsidaryTaxIdAry,
    businessNo,
    invoiceType,
    period,
    track,
    startNo,
    endNo
  ) {
    //Load company Information
    var _companyInfo = config.load({
      type: config.Type.COMPANY_INFORMATION
    })
    //暫借欄位做統編
    var _ban = _companyInfo.getValue({
      fieldId: 'employerid'
    })
    var _isError = false
    var _errorMsg = ''

    //檢查須為權限內統編
    if (userSubsidaryTaxIdAry.toString().indexOf(businessNo) == -1) {
      _errorMsg += '匯入統編錯誤,'
      _isError = true
    }

    //統編8碼
    if (businessNo.length != 8) {
      _errorMsg += '統編長度需為8碼,'
      _isError = true
    }

    //統編與設定檔檢查
    /**
     if (businessNo !== _ban) {
      _errorMsg += '統編[' + businessNo + ']錯誤,'
      _isError = true
    }
     */
    //類別代號(07,08)
    if (invoiceType != '07' && invoiceType != '08') {
      _errorMsg += '發票類別代號需為07或08,'
      _isError = true
    }
    //期間 109/07~109/08
    var _yearMonthAry = period.split('~')

    if (_yearMonthAry.length != 2) {
      _errorMsg += '發票期別格式須為YYY/MM~YYY/MM,'
      _isError = true
    } else {
      var _firstYearMonth = _yearMonthAry[0].replace('/', '').trim()
      var _lastYearMonth = _yearMonthAry[1].replace('/', '').trim()

      if (_firstYearMonth.length != 5 && _lastYearMonth.length != 5) {
        _errorMsg += '發票期別起訖格式需為YYY/MM,'
        _isError = true
      }
    }

    //字軌2碼
    if (track.length != 2) {
      _errorMsg += '發票字軌長度需為2碼,'
      _isError = true
    }
    //發票號碼8碼
    if (startNo.length != 8) {
      _errorMsg += '發票起號長度需為8碼,'
      _isError = true
    }
    if (endNo.length != 8) {
      _errorMsg += '發票迄號長度需為8碼,'
      _isError = true
    }
    //字軌本數上限
    // var _number_count =
    //   (stringutility.convertToFloat(endNo) -
    //     stringutility.convertToFloat(startNo) +
    //     1) /
    //   50
    // if (_number_count > _count_limit) {
    //   _errorMsg += '字軌本數勿超過' + _count_limit + '本,'
    // _isError = true
    // }

    if (checkAssignLogDuplicate(businessNo, track, startNo, endNo) == true) {
      _errorMsg += '發票號碼重複,'
      _isError = true
    }

    var _msgObject = { hasError: _isError, message: _errorMsg }

    return _msgObject
  }

  function checkAssignLogDuplicate(businessNo, track, startNo, endNo) {
    var _isError = false
    try {
      var _mySearch = search.load({
        id: _assignLogSearchId
      })
      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_assignlog_businessno',
        search.Operator.IS,
        businessNo
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_invoicetrack',
        search.Operator.IS,
        track
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_startno',
        search.Operator.GREATERTHANOREQUALTO,
        startNo
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_endno',
        search.Operator.LESSTHANOREQUALTO,
        endNo
      ])

      _mySearch.filterExpression = _filterArray
      log.debug('Check Error', _filterArray.toString())

      _mySearch.run().each(function (result) {
        _isError = true
        return true
      })
    } catch (e) {
      log.error(e.name, e.message)
    }
    return _isError
  }

  //for test to remove data
  function removeRecord() {
    try {
      ////////////////////////////////////////////////////////////////////
      var _mainSearch = search.create({
        type: _assignLogRecordId
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_assignlog_businessno',
        'is',
        '24549210'
      ])
      _mainSearch.filterExpression = _filterArray
      _mainSearch.run().each(function (result) {
        var internalid = result.id
        record.delete({
          type: _assignLogRecordId,
          id: internalid
        })
        return true
      })
      log.debug('完成', '完成刪除')
    } catch (e) {
      log.debug(e.name, e.message)
    }
  }

  function getApplyPeriodOptionsId(yearMonth) {
    var _internalid = -1
    try {
      ////////////////////////////////////////////////////////////////////
      var _search = search.create({
        type: 'customrecord_gw_apply_period_options'
      })

      var _filterArray = []
      _filterArray.push(['custrecord_gw_apply_period_value', 'is', yearMonth])
      _search.filterExpression = _filterArray

      _search.run().each(function (result) {
        _internalid = result.id

        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
    return _internalid
  }

  function onRequest(context) {
    var form = serverWidget.createForm({
      title: '電子發票字軌匯入作業'
    })

    //file
    var _file = form.addField({
      id: 'assignlog_uploadfiles',
      type: serverWidget.FieldType.FILE,
      label: 'AssignLog Upload File'
    })
    _file.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE
    })

    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_select_deptcode',
      type: serverWidget.FieldType.SELECT,
      label: '部門'
    })
    _selectDeptCode.addSelectOption({
      value: '',
      text: 'NONE'
    })
    _selectDeptCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE
    })

    var _deptCodeSearch = search
      .create({
        type: search.Type.DEPARTMENT,
        columns: ['internalid', 'name']
      })
      .run()
      .each(function (result) {
        var internalid = result.getValue({
          name: 'internalid'
        })
        var deptname = result.getValue({
          name: 'name'
        })

        _selectDeptCode.addSelectOption({
          value: internalid,
          text: deptname
        })
        return true
      })

    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_select_classification',
      type: serverWidget.FieldType.SELECT,
      label: '分類'
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE'
    })
    _selectClassification.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE
    })

    var _classificationSearch = search
      .create({
        type: search.Type.CLASSIFICATION,
        columns: ['internalid', 'name']
      })
      .run()
      .each(function (result) {
        var internalid = result.getValue({
          name: 'internalid'
        })
        var deptname = result.getValue({
          name: 'name'
        })

        _selectClassification.addSelectOption({
          value: internalid,
          text: deptname
        })
        return true
      })

    var _sublist = form.addSublist({
      id: 'sublist',
      type: serverWidget.SublistType.LIST,
      label: '字軌清單'
    })
    _sublist.addField({
      id: 'assignlogseq',
      type: serverWidget.FieldType.TEXT,
      label: '序號'
    })
    _sublist.addField({
      id: 'invoicetype',
      type: serverWidget.FieldType.TEXT,
      label: '發票類型'
    })
    _sublist.addField({
      id: 'assignlogdeptcode',
      type: serverWidget.FieldType.TEXT,
      label: '部門'
    })
    _sublist.addField({
      id: 'assignlogclassfication',
      type: serverWidget.FieldType.TEXT,
      label: '分類'
    })
    _sublist.addField({
      id: 'invoiceperiod',
      type: serverWidget.FieldType.TEXT,
      label: '年月'
    })
    _sublist.addField({
      id: 'trackno',
      type: serverWidget.FieldType.TEXT,
      label: '字軌'
    })
    _sublist.addField({
      id: 'startno',
      type: serverWidget.FieldType.TEXT,
      label: '起號'
    })
    _sublist.addField({
      id: 'endno',
      type: serverWidget.FieldType.TEXT,
      label: '迄號'
    })
    _sublist.addField({
      id: 'resultmessage',
      type: serverWidget.FieldType.TEXT,
      label: '處理結果'
    })

    form.addSubmitButton({
      label: '存檔'
    })

    context.response.writePage(form)

    if (context.request.method === 'POST') {
      //removeRecord();
      var _user_subsidary_taxId_ary = getUserSubsidaryTaxId()

      //dept code
      var _selectDeptCode = context.request.parameters.custpage_select_deptcode
      var _selectDeptName = ''
      if (_selectDeptCode != '') {
        var _record = record.load({
          type: record.Type.DEPARTMENT,
          id: _selectDeptCode,
          isDynamic: true
        })
        _selectDeptName = _record.getValue({
          fieldId: 'name'
        })
      }

      var _selectClassification =
        context.request.parameters.custpage_select_classification
      var _selectClassificationName = ''
      if (_selectClassification != '') {
        var _record = record.load({
          type: record.Type.CLASSIFICATION,
          id: _selectClassification,
          isDynamic: true
        })
        _selectClassificationName = _record.getValue({
          fieldId: 'name'
        })
      }
      //start access file
      var _assignlogfile = context.request.files.assignlog_uploadfiles
      if (_assignlogfile == null) {
        return
      }
      var _iterator = _assignlogfile.lines.iterator()
      // Skip the first line, which is the CSV header line
      _iterator.each(function () {
        return false
      })
      // Process each line in the file

      var row = 0
      var _jsonAry = []
      var _hasError = false
      //處理檔案資料
      _iterator.each(function (line) {
        var lineValues = line.value.split(',')

        var _businessno = lineValues[0]
        var _startNo = parseFloat(lineValues[5])
        var _endNo = parseFloat(lineValues[6])

        var _invoiceType = lineValues[1]

        var _status = '11'
        var _usedCount = 0
        var _version = 0
        var _invoiceTrack = lineValues[4]

        var _period = lineValues[3]
        var _yearMonthAry = _period.split('~')
        var _yearMonth = _yearMonthAry[1].replace('/', '')

        //check Data
        var _resultJsonObject = verifyColumn(
          _user_subsidary_taxId_ary,
          _businessno,
          _invoiceType,
          _period,
          _invoiceTrack,
          stringutility.padding('' + _startNo, 8),
          stringutility.padding('' + _endNo, 8)
        )
        log.debug(
          'Import module',
          'hasError=' +
            _resultJsonObject.hasError +
            ' , message=' +
            _resultJsonObject.message
        )

        //紀錄錯誤
        if (_resultJsonObject.hasError == true) {
          //序號
          _sublist.setSublistValue({
            id: 'assignlogseq',
            line: row,
            value: row + 1
          })

          //發票類型
          _sublist.setSublistValue({
            id: 'invoicetype',
            line: row,
            value: _invoiceType
          })
          //部門
          _sublist.setSublistValue({
            id: 'assignlogdeptcode',
            line: row,
            value: _selectDeptCode + '-' + _selectDeptName
          })
          //類別
          var _selectClassName =
            _selectClassification + '-' + _selectClassificationName
          _sublist.setSublistValue({
            id: 'assignlogclassfication',
            line: row,
            value: _selectClassName
          })
          //期別
          _sublist.setSublistValue({
            id: 'invoiceperiod',
            line: row,
            value: _yearMonth
          })
          //字軌
          _sublist.setSublistValue({
            id: 'trackno',
            line: row,
            value: _invoiceTrack
          })
          //起號
          _sublist.setSublistValue({
            id: 'startno',
            line: row,
            value: stringutility.padding('' + _startNo, 8)
          })
          //迄號
          _sublist.setSublistValue({
            id: 'endno',
            line: row,
            value: stringutility.padding('' + _endNo, 8)
          })
          _sublist.setSublistValue({
            id: 'resultmessage',
            line: row,
            value: _resultJsonObject.message
          })
          _hasError = true
          row++
        } else {
          _jsonAry.push(line.value)
        }

        return true
      })

      //set data to sublist
      if (_hasError == false && _jsonAry != null) {
        row = 0
        for (var a = 0; a < _jsonAry.length; a++) {
          var _line_value = _jsonAry[a]

          var lineValues = _line_value.split(',')

          var _businessno = lineValues[0]
          var _startNo = parseFloat(lineValues[5])
          var _endNo = parseFloat(lineValues[6])
          var _diff = Math.round((_endNo - _startNo + 1) / 50)

          var _invoiceType = lineValues[1]

          var _status = '11'
          var _usedCount = 0
          var _version = 0
          var _invoiceTrack = lineValues[4]

          var _yearMonthAry = lineValues[3].split('~')
          var _yearMonth = stringutility.trim(_yearMonthAry[1].replace('/', ''))

          //var _applyPeriodRecord = applyPeriodService.getRecordByValue(_yearMonth);
          var _internal_id = getApplyPeriodOptionsId(_yearMonth)

          var _periodRecord = record.load({
            type: 'customrecord_gw_apply_period_options',
            isDynamic: true,
            id: _internal_id
          })

          for (var i = 0; i < _diff; i++) {
            _endNo = _startNo + 49
            //序號
            _sublist.setSublistValue({
              id: 'assignlogseq',
              line: row,
              value: row + 1
            })

            //發票類型
            _sublist.setSublistValue({
              id: 'invoicetype',
              line: row,
              value: _invoiceType
            })
            //部門
            _sublist.setSublistValue({
              id: 'assignlogdeptcode',
              line: row,
              value: _selectDeptCode + '-' + _selectDeptName
            })
            //類別
            var _selectClassName =
              _selectClassification + '-' + _selectClassificationName
            _sublist.setSublistValue({
              id: 'assignlogclassfication',
              line: row,
              value: _selectClassName
            })
            //期別
            _sublist.setSublistValue({
              id: 'invoiceperiod',
              line: row,
              value: _yearMonth
            })
            //字軌
            _sublist.setSublistValue({
              id: 'trackno',
              line: row,
              value: _invoiceTrack
            })
            //起號
            _sublist.setSublistValue({
              id: 'startno',
              line: row,
              value: stringutility.padding('' + _startNo, 8)
            })
            //迄號
            _sublist.setSublistValue({
              id: 'endno',
              line: row,
              value: stringutility.padding('' + _endNo, 8)
            })
            //////////////////////////////////////////////////////////////////////////////
            //Save to assignLog Record Start
            var _periodSublistId = 'recmachcustrecord_gw_assignlog_peroid'
            try {
              _periodRecord.selectNewLine({
                sublistId: _periodSublistId
              })
            } catch (e) {
              log.error(e.name, e.message)
            }
            ////////////////////////////////////////////////////////
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'name',
              value: 'assignlog'
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_businessno',
              value: _businessno
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_deptcode',
              value: _selectDeptCode
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_deptname',
              value: _selectDeptName
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_classification',
              value: _selectClassification
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_class_name',
              value: _selectClassificationName
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_invoicetype',
              value: _invoiceType
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_invoicetrack',
              value: _invoiceTrack
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_startno',
              value: stringutility.padding('' + _startNo, 8)
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_endno',
              value: stringutility.padding('' + _endNo, 8)
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_yearmonth',
              value: _yearMonth.toString()
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_status',
              value: _status
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_last_invoice_date',
              value: 0
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_usedcount',
              value: _usedCount
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_assignlog_version',
              value: _version
            })
            _periodRecord.setCurrentSublistValue({
              sublistId: _periodSublistId,
              fieldId: 'custrecord_gw_egui_format_code',
              value: _invoceFormatCode
            })
            ////////////////////////////////////////////////////////
            try {
              _periodRecord.commitLine({
                sublistId: _periodSublistId
              })
            } catch (e) {
              log.error(e.name, e.message)
            }
            ////////////////////////////////////////////////////////
            /**
             var assignLogRecord = record.create({
								type: _assignLogRecordId,
								isDynamic:true
							});

             assignLogRecord.setValue({fieldId:'name',value:'assignlog'});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_businessno',value:_businessno});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_deptcode',value:_selectDeptCode});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_deptname',value:_selectDeptName});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_classification',value:_selectClassification});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_class_name',value:_selectClassificationName});

             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_invoicetype',value:_invoiceType});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_invoicetrack',value:_invoiceTrack});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_startno',value: stringutility.padding(''+_startNo, 8)});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_endno',value:stringutility.padding(''+_endNo, 8)});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_yearmonth',value:_yearMonth.toString()});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_status',value:_status});
             //assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_taketime',value:_startdate});
             //assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_lastinvnumbe',value:_twcurrency});
             //assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_reason',value:_selectowner});
             assignLogRecord.setValue({fieldId:'custrecord_gw_last_invoice_date',value:0});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_usedcount',value:_usedCount});
             assignLogRecord.setValue({fieldId:'custrecord_gw_assignlog_version',value:_version});
             assignLogRecord.setValue({fieldId:'custrecord_gw_egui_format_code',value:_invoceFormatCode});
             try {
								 var callId = assignLogRecord.save();
								 log.debug('Call assignLogObj record created successfully', 'Id: ' + callId);
							} catch (e) { 
								 log.error ({ 
								   title: e.name,
								   details: e.message
								 });   
							}
             */
            //Save to assignLog Record End
            ////////////////////////////////////////////////////////////////////////////////////////////////////////
            //處理結果
            var resultmessage = '處理成功'
            _startNo = _endNo + 1
            //處理結果
            _sublist.setSublistValue({
              id: 'resultmessage',
              line: row,
              value: resultmessage
            })
            row++
          }

          try {
            //save record
            _periodRecord.save({
              ignoreMandatoryFields: true,
              enableSourcing: false
            })
          } catch (e) {
            log.error(e.name, e.message)
          }
        }
      }
      //end access file
    }
  }

  return {
    onRequest: onRequest
  }
})
