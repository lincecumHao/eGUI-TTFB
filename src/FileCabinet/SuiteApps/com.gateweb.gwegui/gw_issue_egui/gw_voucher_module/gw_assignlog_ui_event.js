/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/search',
  'N/currentRecord',
  'N/record',
  'N/url',
  '../gw_common_utility/gw_common_gwmessage_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_configure',
], function (
  search,
  currentRecord,
  record,
  url,
  gwmessage,
  invoiceutility,
  stringutility,
  gwconfigure
) {
  var _assignLogRecordId = gwconfigure.getGwAssignLogRecordId()
  var _assignLogSearchId = gwconfigure.getGwAssignLogSearchId()

  var _currentRecord = currentRecord.get()
  var _idArray = [-1]
  var _assignLogObjArray = [
    { deptcode: '-1', classfication: '-1', statusid: '-1' },
  ]

  //字軌本數上限
  var _count_limit = 150

  function fieldChanged(context) {
    if (window.onbeforeunload) {
      //avoid change warning
      window.onbeforeunload = function () {
        null
      }
    }

    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)

    if (_changeFieldId == 'custpage_status') {
      var _custpage_status = _currentRecord.getValue({
        fieldId: _changeFieldId,
      })
      console.log('_custpage_status value=' + _custpage_status)
      var _voidField = _currentRecord.getField({
        fieldId: 'custpage_assignlog_reason',
      })
      if (_custpage_status == '14' || _custpage_status == '24') {
        //顯示作廢理由
        _voidField.isDisplay = true
      } else {
        //隱藏作廢理由
        _voidField.isDisplay = false
      }
    }

    //年月變更
    if (
      _changeFieldId == 'custpage_track_year_month' ||
      _changeFieldId == 'custpage_egui_format_code'
    ) {
      try {
        var _yearMonth = _currentRecord.getValue({
          fieldId: 'custpage_track_year_month',
        })

        //if (_yearMonth.length >= 5) {
        //格式代號
        var _custpage_select_invoice_track = 'custpage_select_invoice_track'
        var _selected_invoice_track = _currentRecord.getField({
          fieldId: _custpage_select_invoice_track,
        })

        //清除 All Option
        _selected_invoice_track.removeSelectOption({
          value: null,
        })

        //31-SP3-50-07
        var _selectedFormatCode = _currentRecord.getValue({
          fieldId: 'custpage_egui_format_code',
        })

        var _formatCodeAry = _selectedFormatCode.split('-')
        var _typeCode = _formatCodeAry[0]
        var _invoiceType = _formatCodeAry[3]
        var _trackAry = invoiceutility.getAssignLogTrack(
          _yearMonth,
          _invoiceType,
          _typeCode
        )

        if (_trackAry != null) {
          _selected_invoice_track.insertSelectOption({
            value: ' ',
            text: 'NONE',
          })
          for (var i = 0; i < _trackAry.length; i++) {
            var _track = _trackAry[i]
            console.log('_track=' + _track)
            _selected_invoice_track.insertSelectOption({
              value: _track,
              text: _track,
            })
          }
        }
        //}
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }
    }
  }

  function validate(
    selectedStatus,
    selectedDeptCode,
    selectedClassification,
    voidReason
  ) {
    var _checkFlag = true
    var _error_message = ''

    for (var i = 1; i < _assignLogObjArray.length; i++) {
      var _obj = _assignLogObjArray[i]

      var _deptcode = _obj.deptcode
      var _classfication = _obj.classfication
      var _status = _obj.statusid
      //1. 一般字軌
      if (_status === '11') {
        //空白本
        if (selectedStatus === '12') {
          _error_message += '不可變更為=>[一般字軌-使用中]!'
        }
        /**
        if (selectedStatus === '21') {
          _error_message += '不可變更為=>[歷史發票字軌-未使用]!'
        }
        */
        if (selectedStatus === '22') {
          _error_message += '不可變更為=>[歷史發票字軌-使用中]!'
        }
        if (selectedStatus === '23') {
          _error_message += '不可變更為=>[歷史發票字軌-已使用完畢]!'
        }
        if (selectedStatus === '24') {
          _error_message += '不可變更為=>[歷史發票字軌-作廢]!'
        }
        /**
        if (selectedStatus === '31') {
	        _error_message += '不可變更為=>[外部發票字軌-未使用]!'
	    }
        */
	    if (selectedStatus === '32') {
	        _error_message += '不可變更為=>[外部發票字軌-使用中]!'
	    }
	    if (selectedStatus === '33') {
	        _error_message += '不可變更為=>[外部發票字軌-已使用完畢]!'
	    }
	    if (selectedStatus === '34') {
	        _error_message += '不可變更為=>[外部發票字軌-作廢]!'
	    }
        
        
      } else if (_status === '12') {
        if (selectedStatus === '11') {
          _error_message += '不可變更為=>[一般字軌-未使用]!'
        }
        if (selectedStatus === '14') {
          _error_message += '不可變更為=>[一般字軌-作廢])!'
        }
        if (selectedStatus !== '' && parseInt(_status) > 20 && parseInt(_status) < 30) {
          _error_message += '不可變更為=>[歷史發票字軌])!'
        }
        if (selectedStatus !== '' && parseInt(_status) > 30) {
            _error_message += '不可變更為=>[外部發票字軌])!'
        }
        if (
          _deptcode + '' + _classfication !==
          selectedDeptCode + '' + selectedClassification
        ) {
          _error_message += '使用中字軌不可變更至其他部門或類別!'
        }
      } else if (_status === '13') {
        _error_message += '字軌已使用完畢不可變更!'
      } else if (_status === '14') {
        _error_message += '字軌已作廢不可變更!'
      }

      //2. 不上傳字軌
      if (_status === '21') {
        //空白本
        if (selectedStatus === '22') {
          _error_message += '不可變更為=>[歷史發票字軌-使用中]!'
        }
        /**
        if (selectedStatus === '11') {
          _error_message += '不可變更為=>[一般字軌-未使用]!'
        }
        */
        if (selectedStatus === '12') {
          _error_message += '不可變更為=>[一般字軌-使用中]!'
        }
        if (selectedStatus === '13') {
          _error_message += '不可變更為=>[一般字軌-已使用完畢]!'
        }
        if (selectedStatus === '14') {
          _error_message += '不可變更為=>[一般字軌-作廢]!'
        }
        /**
        if (selectedStatus === '31') {
	        _error_message += '不可變更為=>[外部發票字軌-未使用]!'
	    }
	    */
	    if (selectedStatus === '32') {
	        _error_message += '不可變更為=>[外部發票字軌-使用中]!'
	    }
	    if (selectedStatus === '33') {
	        _error_message += '不可變更為=>[外部發票字軌-已使用完畢]!'
	    }
	    if (selectedStatus === '34') {
	        _error_message += '不可變更為=>[外部發票字軌-作廢]!'
	    }
	    
      } else if (_status === '22') {
        if (selectedStatus === '21') {
          _error_message += '不可變更為=>[歷史發票字軌-未使用]!'
        }
        if (selectedStatus === '24') {
          _error_message += '不可變更為=>[歷史發票字軌-作廢])!'
        }
        if (selectedStatus !== '' && parseInt(_status) < 20) {
          _error_message += '不可變更為=>[一般字軌])!'
        }
        if (selectedStatus !== '' && parseInt(_status) > 30) {
            _error_message += '不可變更為=>[外部發票字軌])!'
        }
        if (
          _deptcode + '' + _classfication !==
          selectedDeptCode + '' + selectedClassification
        ) {
          _error_message += '使用中(不上傳)字軌不可變更至其他部門或類別!'
        }
      } else if (_status === '23') {
        _error_message += '歷史發票字軌已使用完畢不可變更!'
      } else if (_status === '24') {
        _error_message += '歷史發票字軌已作廢不可變更!'
      }
      
      if (_status === '31') {
          //空白本
          if (selectedStatus === '32') {
            _error_message += '不可變更為=>[外部發票字軌-使用中]!'
          }
          /**
          if (selectedStatus === '11') {
            _error_message += '不可變更為=>[一般字軌-未使用]!'
          }
          */
          if (selectedStatus === '12') {
            _error_message += '不可變更為=>[一般字軌-使用中]!'
          }
          if (selectedStatus === '13') {
            _error_message += '不可變更為=>[一般字軌-已使用完畢]!'
          }
          if (selectedStatus === '14') {
            _error_message += '不可變更為=>[一般字軌-作廢]!'
          }
          /**
          if (selectedStatus === '21') {
  	        _error_message += '不可變更為=>[歷史發票字軌-未使用]!'
	  	  }
          */
	  	  if (selectedStatus === '22') {
	  	      _error_message += '不可變更為=>[歷史發票字軌-使用中]!'
	  	  }
	  	  if (selectedStatus === '23') {
	  	      _error_message += '不可變更為=>[歷史發票字軌-已使用完畢]!'
	  	  }
	  	  if (selectedStatus === '24') {
	  	      _error_message += '不可變更為=>[歷史發票字軌-作廢]!'
	  	  }
  	    
        } else if (_status === '32') {
          if (selectedStatus === '31') {
            _error_message += '不可變更為=>[外部發票字軌-未使用]!'
          }
          if (selectedStatus === '34') {
            _error_message += '不可變更為=>[外部發票字軌-作廢])!'
          }
          if (selectedStatus !== '' && parseInt(_status) < 20) {
            _error_message += '不可變更為=>[一般字軌])!'
          }
          if (selectedStatus !== '' && parseInt(_status) > 20 && parseInt(_status) < 30) {
              _error_message += '不可變更為=>[歷史發票字軌])!'
          }
          if (
            _deptcode + '' + _classfication !==
            selectedDeptCode + '' + selectedClassification
          ) {
            _error_message += '使用中(不上傳)字軌不可變更至其他部門或類別!'
          }
        } else if (_status === '33') {
          _error_message += '外部發票字軌已使用完畢不可變更!'
        } else if (_status === '34') {
          _error_message += '外部發票字軌已作廢不可變更!'
        }       
    } 

    if (_error_message.length != 0) _checkFlag = false
    var _errorObj = {
      checkFlag: _checkFlag,
      message: _error_message,
    }
    return _errorObj
  }

  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
    var changeLineId = _currentRecord.getCurrentSublistIndex({
      sublistId: changedSubListId,
    })
    console.log('changeLineId=' + changeLineId)

    var checkedResult = _currentRecord.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'customer_search_assignlog_check_id',
    })
    var selectCheckId = _currentRecord.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'customer_search_assignlog_id',
    })

    var _deptcode = _currentRecord.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'customer_selected_assignlog_deptcode',
    })
    var _classfication = _currentRecord.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'customer_selected_assignlog_classification',
    })
    var _status = _currentRecord.getCurrentSublistValue({
      sublistId: changedSubListId,
      fieldId: 'customer_selected_assignlog_status',
    })

    console.log(
      'checkedResult=' +
        checkedResult +
        ', selectCheckId=' +
        selectCheckId +
        ' ,_deptcode=' +
        _deptcode +
        ' ,_classfication=' +
        _classfication +
        ' ,_status=' +
        _status
    )
    if (checkedResult) {
      //add to array
      _idArray.push(selectCheckId)
      var _obj = {
        deptcode: stringutility.trim(_deptcode),
        classfication: stringutility.trim(_classfication),
        statusid: stringutility.trim(_status),
      }
      _assignLogObjArray.push(_obj)
    } else {
      //remove from array
      for (var i = 0; i <= _idArray.length; i++) {
        if (_idArray[i] === selectCheckId) {
          _idArray.splice(i, 1)
          _assignLogObjArray.splice(i, 1)
        }
      }
    }

    _currentRecord.setValue({
      fieldId: 'custpage_assignlog_hiddent_listid',
      value: _idArray.toString(),
      ignoreFieldChange: true,
    })

    console.log('idArray=' + _idArray)
  }

  function saveAssignLogs() {
    //document.forms[0].style.cursor = 'wait';
    try {
      var _businessNo = _currentRecord.getValue({
        fieldId: 'custpage_businessno',
      })
      var _yearMonth = _currentRecord.getValue({
        fieldId: 'custpage_year_month',
      })
      var _selectStatus = _currentRecord.getValue({
        fieldId: 'custpage_status',
      })
      var _selectDeptCode = _currentRecord.getValue({
        fieldId: 'custpage_select_deptcode',
      })
      var _selectClassification = _currentRecord.getValue({
        fieldId: 'custpage_select_classification',
      })
      var _assignlog_reason = _currentRecord.getValue({
        fieldId: 'custpage_assignlog_reason',
      })
      var _assignlog_hiddent_listId = _currentRecord.getValue({
        fieldId: 'custpage_assignlog_hiddent_listid',
      })

      var checkedResult = _currentRecord.getCurrentSublistValue({
        sublistId: 'assignlogsublistid',
        fieldId: 'customer_search_assignlog_check_id',
      })

      //驗證資料
      var _title = '字軌管理'
      var _errorObj = validate(
        _selectStatus,
        _selectDeptCode,
        _selectClassification,
        _assignlog_reason
      )
      if (_errorObj.checkFlag === false) {
        gwmessage.showErrorMessage(_title, _errorObj.message)
      } else {
        var _idAry = _assignlog_hiddent_listId.split(',')
        if (_idAry.length < 2) {
          var _message = '請選取字軌!'
          gwmessage.showWarningMessage(_title, _message)
        } else if (_idAry.length > _count_limit) {
          var _message = '異動筆數勿超過' + _count_limit + '筆!'
          gwmessage.showWarningMessage(_title, _message)
        } else {
          //取得部門及類別名稱
          var _selectDeptName = ''
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
          //類別名稱
          var _selectClassName = ''
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

          for (var i = 0; i < _idAry.length; i++) {
            var _internalId = _idAry[i]

            if (parseInt(_internalId) > 0) {
              //save record
              var _record = record.load({
                type: _assignLogRecordId,
                id: parseInt(_internalId),
                isDynamic: true,
              })
              var _assignlog_status = _record.getValue({
                fieldId: 'custrecord_gw_assignlog_status',
              })
              if (_assignlog_status == '11') {
                _record.setValue({
                  fieldId: 'custrecord_gw_egui_format_code',
                  value: '35',
                })    
                _record.setValue({
                  fieldId: 'custrecord_gw_last_invoice_date',
                  value: 0,
                })
              } 
              //狀態=>有值才填
              if (_selectStatus != '') {
                _record.setValue({
                  fieldId: 'custrecord_gw_assignlog_status',
                  value: _selectStatus,
                })
              }
              //部門
              _record.setValue({
                fieldId: 'custrecord_gw_assignlog_deptcode',
                value: _selectDeptCode,
              })
              _record.setValue({
                fieldId: 'custrecord_gw_assignlog_deptname',
                value: _selectDeptName,
              })
              //類別
              _record.setValue({
                fieldId: 'custrecord_gw_assignlog_classification',
                value: _selectClassification,
              })
              _record.setValue({
                fieldId: 'custrecord_gw_assignlog_class_name',
                value: _selectClassName,
              })
              //作廢理由
              _record.setValue({
                fieldId: 'custrecord_gw_assignlog_reason',
                value: _assignlog_reason,
              })

              try {
                var callId = _record.save()
                log.debug(
                  'Save assignLogObj record successfully',
                  'Id: ' + callId
                )
              } catch (e) {
                log.error({
                  title: e.name,
                  details: e.message,
                })
              }
            }
          }
          //reload assign log
          searchAssignLogs()
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    //document.forms[0].style.cursor = 'default';
  }

  //////////////////////////////////////////////////////////////////////////////////////
  //外部發票-START
  function saveManualAssignLogs() {
    try {
      var _businessNo = _currentRecord.getValue({
        fieldId: 'custpage_businessno',
      })
      //31-SP3-50 ==> 代碼-名稱-裝訂數
      //S:銷項, P/E/C:紙本/電子/收銀機 , 0/2/3 : n聯式(0:電子發票)
      var _eguiFormatID = _currentRecord.getValue({
        fieldId: 'custpage_egui_format_code',
      })
      var _yearMonth = _currentRecord.getValue({
        fieldId: 'custpage_track_year_month',
      })
      var _selectInvoiceTrack = _currentRecord.getValue({
        fieldId: 'custpage_select_invoice_track',
      })
      var _selectStartNo = _currentRecord.getValue({
        fieldId: 'custpage_start_invoiceno',
      })
      var _selectEndNo = _currentRecord.getValue({
        fieldId: 'custpage_end_invoiceno',
      })
      var _assignlog_hiddent_listId = _currentRecord.getValue({
        fieldId: 'custpage_assignlog_hiddent_listid',
      })
      var _select_invoice_type = _currentRecord.getValue({
        fieldId: 'custpage_select_invoice_type',
      })

      var _eguiFormatCodeAry = _eguiFormatID.split('-')
      var _eguiFormatCode = _eguiFormatCodeAry[0]
      var _eguiFormatName = _eguiFormatCodeAry[1]
      var _eguiFormatCount = stringutility.convertToInt(_eguiFormatCodeAry[2])
      var _invoiceType = _eguiFormatCodeAry[3]

      //驗證資料
      var _title = '字軌管理'
      var _errorObj = validateManual(
        _businessNo,
        _selectInvoiceTrack,
        _yearMonth,
        _selectStartNo,
        _selectEndNo,
        _eguiFormatCount
      )

      if (_errorObj.checkFlag === false) {
        gwmessage.showErrorMessage(_title, _errorObj.message)
      } else {
        //////////////////////////////////////////////////////////////////////////
        //分割字軌
        var _version = 0
        var _start_number = stringutility.convertToInt(_selectStartNo)
        var _end_number = stringutility.convertToInt(_selectEndNo)
        var _diff = Math.round(
          (_end_number - _start_number + 1) / _eguiFormatCount
        )
        //50張1本

        for (var i = 0; i < _diff; i++) {
          _end_number = _start_number + (_eguiFormatCount - 1)

          var _record = record.create({
            type: _assignLogRecordId,
            isDynamic: true,
          })

          _record.setValue({ fieldId: 'name', value: 'assignlog' })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_businessno',
            value: _businessNo,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_invoicetype',
            value: _invoiceType,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_invoicetrack',
            value: _selectInvoiceTrack,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_startno',
            value: _start_number,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_endno',
            value: _end_number,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_yearmonth',
            value: _yearMonth.toString(),
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_status',
            value: _select_invoice_type,
          })

          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_usedcount',
            value: 0,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_assignlog_version',
            value: _version,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_egui_format_code',
            value: _eguiFormatCode,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_egui_format_name',
            value: _eguiFormatName,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_book_binding_count',
            value: _eguiFormatCount,
          })
          _record.setValue({
            fieldId: 'custrecord_gw_last_invoice_date',
            value: 0,
          })

          try {
            var callId = _record.save()
          } catch (e) {
            log.error({
              title: e.name,
              details: e.message,
            })
          }

          //next start number
          _start_number = _end_number + 1
        }
        //reload assign log
        searchAssignLogs()
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    //document.forms[0].style.cursor = 'default';
  }

  function validateManual(
    businessNo,
    track,
    yearMonth,
    startNo,
    endNo,
    eguiFormatCount
  ) {
    var _checkFlag = true
    var _error_message = ''
    try {
      //年月檢查
      if (yearMonth.length != 5) {
        _error_message += '字軌年月需為5碼(YYYMM),'
        _isError = true
      } else {
        var _month = yearMonth.substring(yearMonth.length - 2, yearMonth.length)
        if (
          stringutility.convertToInt(_month) < 1 ||
          stringutility.convertToInt(_month) > 12 ||
          stringutility.convertToInt(_month) % 2 != 0
        ) {
          _error_message += '字軌月分需為2~12月,'
          _isError = true
        }
      }
      //字軌檢查
      var _isletter = /^[A-Z]+$/.test(track)
      if (track.length != 2 || _isletter == false) {
        _error_message += '字軌需為2碼大寫英文字,'
        _isError = true
      }

      //發票號碼8碼
      if (startNo.length != 8 || endNo.length != 8) {
        _error_message += '發票號碼長度需為8碼,'
        _isError = true
      } else if (
        parseFloat(startNo).toString() == 'NaN' ||
        parseFloat(endNo).toString() == 'NaN'
      ) {
        _error_message += '發票號碼請輸入數字8碼,'
        _isError = true
      } else if (
        stringutility.convertToFloat(startNo) >=
        stringutility.convertToFloat(endNo)
      ) {
        _error_message += '發票起訖號碼大小不可顛倒,'
        _isError = true
      } else {
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //檢查起訖號碼(50, 250)倍數
        //50 =>[00,50]~[49,99]
        //250 => [000,250,500,750]~[249,499,749,999]
        var _strLength = 2
        if (eguiFormatCount == 250) {
          _strLength = 3
        }

        var _startNumber = startNo.substring(
          startNo.length - _strLength,
          startNo.length
        )
        var _endNumber = endNo.substring(
          endNo.length - _strLength,
          endNo.length
        )

        if (stringutility.convertToInt(_startNumber) % eguiFormatCount != 0) {
          _error_message +=
            '發票起始號碼尾數(' +
            _strLength +
            ')碼須為(' +
            eguiFormatCount +
            ')倍數,'
          _isError = true
        }
        if (
          (stringutility.convertToInt(_endNumber) + 1) % eguiFormatCount !=
          0
        ) {
          _error_message +=
            '發票截止號碼尾數(' +
            _strLength +
            ')碼須為(' +
            eguiFormatCount +
            ')倍數減1,'
          _isError = true
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //檢查字軌重複
        if (
          checkAssignLogDuplicate(
            businessNo,
            track,
            stringutility.convertToFloat(startNo),
            stringutility.convertToFloat(endNo)
          ) == true
        ) {
          _error_message += '發票號碼重複,'
          _isError = true
        }
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    if (_error_message.length != 0) _checkFlag = false
    var _errorObj = {
      checkFlag: _checkFlag,
      message: _error_message,
    }
    return _errorObj
  }

  function checkAssignLogDuplicate(businessNo, track, startNo, endNo) {
    var _isError = false
    try {
      var _mySearch = search.load({
        id: _assignLogSearchId,
      })
      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_assignlog_businessno',
        search.Operator.IS,
        businessNo,
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_invoicetrack',
        search.Operator.IS,
        track,
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_startno',
        search.Operator.GREATERTHANOREQUALTO,
        startNo,
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_endno',
        search.Operator.LESSTHANOREQUALTO,
        endNo,
      ])

      _mySearch.filterExpression = _filterArray
      log.debug('Check Error', _filterArray.toString())

      _mySearch.run().each(function (result) {
        _isError = true
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _isError
  }

  function getEGUIFormat() {
    try {
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //外部發票-END
  //////////////////////////////////////////////////////////////////////////////////////
  function searchAssignLogs() {
    _currentRecord.setValue({
      fieldId: 'custpage_hiddent_buttontype',
      value: 'search',
      ignoreFieldChange: true,
    })

    document.forms[0].submit()
  }

  function openImportForm(assignlogScriptId, assignlogDeploymentId) {
    try {
      window.location = url.resolveScript({
        scriptId: assignlogScriptId,
        deploymentId: assignlogDeploymentId,
        returnExternalUrl: false,
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function mark(
    flag,
    select_sublistId,
    select_field_id,
    select_checked_field_id
  ) {
    try {
      _idArray = [-1]
      var _num_lines = _currentRecord.getLineCount({
        sublistId: select_sublistId,
      })
      if (_num_lines > 0) {
        for (var i = 0; i < _num_lines; i++) {
          var _id = _currentRecord.getSublistValue({
            sublistId: select_sublistId,
            fieldId: select_field_id,
            line: i,
          })

          var _flag_value = 'F'
          if (flag == true) {
            _flag_value = 'T'
          }

          _currentRecord.selectLine({
            sublistId: select_sublistId,
            line: i,
          })

          _currentRecord.setCurrentSublistValue({
            sublistId: select_sublistId,
            fieldId: select_checked_field_id,
            value: flag,
            ignoreFieldChange: true,
          })

          if (flag == true) _idArray.push(_id)
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_assignlog_hiddent_listid',
        value: _idArray.toString(),
        ignoreFieldChange: true,
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function deleteManualSelected() {
    try {
      var _assignlog_hiddent_listId = _currentRecord.getValue({
        fieldId: 'custpage_assignlog_hiddent_listid',
      })
      var _title = '字軌管理'
      var _idAry = _assignlog_hiddent_listId.split(',')
      if (stringutility.trim(_assignlog_hiddent_listId) == '') {
        var _message = '無字軌資料!'
        gwmessage.showWarningMessage(_title, _message)
      } else if (_idAry.length < 2) {
        var _message = '請選取字軌!'
        gwmessage.showWarningMessage(_title, _message)
      } else if (_idAry.length > _count_limit) {
        var _message = '異動筆數勿超過' + _count_limit + '筆!'
        gwmessage.showWarningMessage(_title, _message)
      } else {
        for (var i = 0; i < _idAry.length; i++) {
          var _internalId = _idAry[i]

          if (parseInt(_internalId) > 0) {
            record.delete({
              type: _assignLogRecordId,
              id: parseInt(_internalId),
            })
          }
        }
        var _message = '刪除完成!'
        gwmessage.showConfirmationMessage(_title, _message)
      }

      searchAssignLogs()
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function pageInit() {
    var _voidField = _currentRecord.getField({
      fieldId: 'custpage_assignlog_reason',
    })
    if (_voidField != null) _voidField.isDisplay = false

    var _formatCodeField = _currentRecord.getField({
      fieldId: 'custpage_egui_format_code',
    })
    var _trackYearMonthField = _currentRecord.getField({
      fieldId: 'custpage_track_year_month',
    })
    var _invoiceTrackField = _currentRecord.getField({
      fieldId: 'custpage_select_invoice_track',
    })
    if (
      _formatCodeField != null &&
      _trackYearMonthField != null &&
      _trackYearMonthField != ''
    ) {
      var _yearMonth = _currentRecord.getValue({
        fieldId: 'custpage_track_year_month',
      })
      var _egui_format_code = _currentRecord.getValue({
        fieldId: 'custpage_egui_format_code',
      })
      var _eguiFormatCodeAry = _egui_format_code.split('-')
      var _eguiFormatCode = _eguiFormatCodeAry[0]
      var _eguiFormatName = _eguiFormatCodeAry[1]
      var _eguiInvoiceType = _eguiFormatCodeAry[3]

      var _trackAry = invoiceutility.getAssignLogTrack(
        _yearMonth,
        _eguiInvoiceType,
        _eguiFormatCode
      )
      if (_trackAry != null) {
        for (var i = 0; i < _trackAry.length; i++) {
          var _track = _trackAry[i]

          _invoiceTrackField.insertSelectOption({
            value: _track,
            text: _track,
          })
        }
      }
    }
  }

  return {
    pageInit: pageInit,
    mark: mark,
    deleteManualSelected: deleteManualSelected,
    saveManualAssignLogs: saveManualAssignLogs,
    searchAssignLogs: searchAssignLogs,
    saveAssignLogs: saveAssignLogs,
    openImportForm: openImportForm,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged,
  }
})
