/**
 *String Invoice Tool
 *gwInvoiceUtility.js
 *@NApiVersion 2.0
 */
define(['N/format', 'N/record', 'N/search'], function (format, record, search) {
  var _assignLogRecordId = 'customrecord_gw_assignlog'
  var _assignLogTrackRecordId = 'customrecord_gw_assignlog_track'
  var _assignLogSearchId = 'customsearch_gw_assignlog_search'
  var _gwVoucherMainSearchId = 'customsearch_gw_voucher_main_search' //Voucher Main

  var _gwDepositVoucherRecordId = 'customrecord_gw_deposit_voucher_record'
  var _gw_voucher_properties = 'customrecord_gw_voucher_properties'
  var invoceFormatCode = '35'

  var _assignLogRefRecordId = 'customrecord_assign_log_ref_record'
	  
  //檢查print_mark 	  
  function getPrintMark(npo_ban, carry_type, buyer_ban) {
	  var _print_mark = 'Y'
	  if (npo_ban.trim().length !=0) {//捐贈碼
		  _print_mark = 'N'
	  } else if (carry_type.trim().length !=0) {
		  if (buyer_ban == '0000000000') {
			  _print_mark = 'N'
		  }	else if (carry_type.trim() != '3J0002') {//手機條碼
			  _print_mark = 'N'
		  }
	  }
	  return _print_mark
  }
  
  function getAllowanceTaxCode(invoiceTaxCode) {
    const invTaxCodeMapAllowanceTaxCode = {
      '31':'33',
      '32':'34',
      '35':'33',
      '36':'34',
      '37':'38'
    }
    return invTaxCodeMapAllowanceTaxCode[invoiceTaxCode]
  }
  
  //字串補0
  function getInvoiceTypeDesc(invoiceType) {
    var invoiceTypeDesc = ''
    switch (invoiceType) {
      case '01':
        invoiceTypeDesc = '31-銷項三聯式'
        break
      case '02':
        invoiceTypeDesc = '32-銷項二聯式'
        break
      case '03':
        invoiceTypeDesc = '32-銷項二聯式收銀機統一發票'
        break
      case '04':
        invoiceTypeDesc = '特種發票'
        break
      case '05':
        invoiceTypeDesc = '31-銷項電子計算機統一發票'
        break
      case '06':
        invoiceTypeDesc = '35-銷項三聯式收銀機統一發票'
        break
      case '07':
        invoiceTypeDesc = '35-一般稅額電子發票'
        break
      case '08':
        invoiceTypeDesc = '特種稅發票'
        break
    }
    return invoiceTypeDesc
  }

  function getMigTypeDesc(migType) {
    var migTypeDesc = ''
    switch (migType) {
      case 'B2BS':
        migTypeDesc = 'B2B存證'
        break
      case 'B2BE':
        migTypeDesc = 'B2B交換'
        break
      case 'B2C':
        migTypeDesc = 'B2C存證'
        break
      case 'B2B':
        migTypeDesc = 'B2B存證'
        break
    }
    return migTypeDesc
  }

  function getMigType(applyType, voucherType, migType) {
    var _id
    try {
      var _file_path = ''
      if (applyType == 'CANCEL') {
        //作廢
        if (voucherType === 'EGUI') {
          if (migType == 'B2BE') {
            _id = 'A0201'
          } else if (migType == 'B2BS') {
            //_id = 'A0401';
            _id = 'C0501'
          } else if (migType == 'B2C') {
            _id = 'C0501'
          } else if (migType == 'B2B') {
        	_id = 'A0501'
          }
        } else if (voucherType === 'ALLOWANCE') {
          if (migType == 'B2BE') {
            //TODO
            _id = 'B0201'
          } else if (migType == 'B2BS') {
            //_id = 'B0401';
            _id = 'D0501'
          } else if (migType == 'B2C') {
            _id = 'D0501'
          } else if (migType == 'B2B') {
        	_id = 'B0501' //買方B0501 
          }
        }
      } else {
        //開立
        if (voucherType === 'EGUI') {
          if (migType == 'B2BE') {
            _id = 'A0101'
          } else if (migType == 'B2BS') {
            //_id = 'A0401';
            _id = 'C0401'
          } else if (migType == 'B2C') {
            _id = 'C0401'
          } else if (migType == 'B2B') {
        	_id = 'A0401'
          }
        } else if (voucherType === 'ALLOWANCE') {
          if (migType == 'B2BE') {
            //TODO
            _id = 'B0101'
          } else if (migType == 'B2BS') {
            //_id = 'B0401';
            _id = 'D0401'
          } else if (migType == 'B2C') {
            _id = 'D0401'
          } else if (migType == 'B2B') {
        	_id = 'B0401'  
          }
        }
      }
    } catch (e) {
      log.debug(e.name, e.message)
    }
    return _id
  }

  function getUploadStatusDesc(statusId) {
    var statusDesc = ''
    switch (statusId) {
      case 'A':
        statusDesc = '待上傳'
        break
      case 'P':
        statusDesc = '上傳中'
        break
      case 'C':
        statusDesc = '開立成功'
        break
      case 'E':
        statusDesc = '開立失敗'
        break
      case 'G':
        statusDesc = '回覆結果異常'
        break
      case 'M':
        statusDesc = '不上傳'
        break
      case 'EU':
          statusDesc = '外部平台代上傳'
          break
      case 'RT':
          statusDesc = '待回收上傳' //RETRIEVE
          break
      case 'D':
        statusDesc = '已刪除'
        break
    }
    return statusDesc
  }

  //1:開立申請(VOUCHER_ISSUE),2:開立成功(VOUCHER_SUCCESS),
  //6:作廢申請(CANCEL_ISSUE) 7:作廢退回(CANCEL_REJECT) 9:作廢成功(CANCEL_SUCCESS)
  var _voucher_issue = 'VOUCHER_ISSUE'
  var _voucher_success = 'VOUCHER_SUCCESS'
  var _voucher_error = 'VOUCHER_ERROR'
  var _cancel_issue = 'CANCEL_ISSUE'
  var _cancel_approve = 'CANCEL_APPROVE'
  var _cancel_reject = 'CANCEL_REJECT'
  var _cancel_upload = 'CANCEL_UPLOAD'
  var _cancel_success = 'CANCEL_SUCCESS'
  var _cancel_error = 'CANCEL_ERROR'

  function getVoucherStatusDesc(statusId) {
    var statusDesc = ''
    switch (statusId) {
      case _voucher_issue:
        statusDesc = '憑證申請'
        break
      case _voucher_success:
        statusDesc = '憑證完成'
        break
      case _voucher_error:
        statusDesc = '憑證錯誤'
        break
      case _cancel_issue:
        statusDesc = '作廢申請'
        break
      case _cancel_approve:
        statusDesc = '作廢同意'
        break
      case _cancel_reject:
        statusDesc = '作廢退回'
        break
      case _cancel_upload:
        statusDesc = '作廢處理'
        break
      case _cancel_success:
        statusDesc = '作廢完成'
        break
      case _cancel_error:
        statusDesc = '作廢錯誤'
        break
    }
    return statusDesc
  }

  function genHash(stringValue) {
    var hash = 7,
      i,
      chr
    if (stringValue.length === 0) return hash
    for (i = 0; i < stringValue.length; i++) {
      chr = stringValue.charCodeAt(i)
      hash = (hash << 5) - hash + chr
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  }

  function getRandomNumNew(eguiNumber, sellerTaxId) {
    var eguiNumberStr = eguiNumber + ''
    var sellerTaxIdStr = sellerTaxId + ''
    var randomNumber = (
      Math.abs(genHash(eguiNumberStr + sellerTaxIdStr)) % 10000
    ).toString()
  
    randomNumber=padding(randomNumber, 4)

    return randomNumber
  }
  //取亂數
  function getRandomNum(min, max) {
    var range = max - min
    var rand = Math.random()
    return min + Math.round(rand * range)
  }

  //取得折讓單號碼 
  function getAllowanceNumber(pre_allowance, date) {
    var _randomNumber = randomWord(true, 5, 5)  
    var _allowanceNumber = pre_allowance + date + _randomNumber
    return _allowanceNumber
  }

  /*
   ** randomWord 產生任意長度隨機字母數字組合
   ** randomFlag-是否任意長度 min-任意長度最小位[固定位數] max-任意長度最大位
   */
  function randomWord(randomFlag, min, max) {
    var str = ''
    var range = min
    var arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

    // 隨機產生
    if (randomFlag) {
      range = Math.round(Math.random() * (max - min)) + min
    }
    for (var i = 0; i < range; i++) {
      pos = Math.round(Math.random() * (arr.length - 1))
      str += arr[pos]
    }
    return str
  }

  //補0
  function padding(str, length) {
    return (Array(length).join('0') + str).slice(-length)
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //取得發票號碼 16 點
  var _defaultAssignLogType = 'TYPE_1'

  function getAssignLogNumber(
    invoice_type,
    ban,
    dept_code,
    classification,
    year_month,
    assignLogType,
    voucher_date
  ) {
    var _resultNumber = ''
    var _assignLogSearch = search.create({
      type: _assignLogRecordId,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'name' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_businessno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_deptcode' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_deptname' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_classification' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_class_name' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_invoicetype' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_invoicetrack' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_startno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_endno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_yearmonth' }),
        search.createColumn({ name: 'custrecord_gw_last_invoice_date' }),
        search.createColumn({
          name: 'custrecord_gw_assignlog_status',
          sort: search.Sort.DESC
        }),
        search.createColumn({ name: 'custrecord_gw_assignlog_taketime' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_lastinvnumbe' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_reason' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_usedcount' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_version' })
      ]
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_assignlog_businessno',
      search.Operator.IS,
      ban
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_egui_format_code',
      search.Operator.IS,
      invoceFormatCode
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_assignlog_invoicetype',
      search.Operator.IS,
      invoice_type
    ])

    if (dept_code === '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_deptcode',
        search.Operator.ISEMPTY,
        ''
      ])
    } else {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_deptcode',
        search.Operator.IS,
        dept_code
      ])
    }
    if (classification === '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        search.Operator.ISEMPTY,
        ''
      ])
    } else {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        search.Operator.IS,
        classification
      ])
    }
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_assignlog_yearmonth',
      search.Operator.IS,
      year_month
    ])

    //檢查日期資料(申請日期要大於字軌日期)
    //_filterArray.push('and')
    //_filterArray.push(['custrecord_gw_last_invoice_date',search.Operator.LESSTHANOREQUALTO, parseInt(voucher_date)]);
    /**
	_filterArray.push([
      [
        'custrecord_gw_last_invoice_date',
        search.Operator.LESSTHANOREQUALTO,
        parseInt(voucher_date),
      ],
      'or',
      ['custrecord_gw_last_invoice_date', search.Operator.EQUALTO, 0],
    ])
    */
    _filterArray.push('and')
    if (assignLogType !== 'NONE') {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '11'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '12']
      ])
    } else {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '21'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '22']
      ])
    }
    //alert('Parse 11 _filterArray='+JSON.stringify(_filterArray));
    _assignLogSearch.filterExpression = _filterArray

    var _assignLogSearchResult = _assignLogSearch.run().getRange({
      start: 0,
      end: 1
    })

    for (var i = 0; i < _assignLogSearchResult.length; i++) {
      var _internalid = _assignLogSearchResult[i].id
      //alert('_assignLogSearchResult[i]='+JSON.stringify(_assignLogSearchResult[i]));
      var _lastInvoiceDate = _assignLogSearchResult[i].getValue({
        name: 'custrecord_gw_last_invoice_date'
      })

      if (parseInt(voucher_date) >= parseInt(_lastInvoiceDate)) {
        var _status = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_status'
        })
        var _startNo = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_startno'
        })
        _startNo = padding('' + _startNo, 8)

        var _lastinvnumbe = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_lastinvnumbe'
        })
        var _invoiceTrack = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_invoicetrack'
        })

        var _assignLogRecord = record.load({
          type: _assignLogRecordId,
          id: _internalid,
          isDynamic: true
        })

        if (parseInt(_status) === 11 || parseInt(_status) === 21) {
          //新字軌
          var _assignlog_lastinvnumbe = _startNo
          if (parseInt(_status) === 11) {
            _assignLogRecord.setValue({
              fieldId: 'custrecord_gw_assignlog_status',
              value: '12'
            })
          } else if (parseInt(_status) === 21) {
            _assignLogRecord.setValue({
              fieldId: 'custrecord_gw_assignlog_status',
              value: '22'
            })
          }
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe',
            value: _assignlog_lastinvnumbe
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_usedcount',
            value: '1'
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_last_invoice_date',
            value: voucher_date
          })

          try {
            var callId = _assignLogRecord.save()
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }

          _resultNumber = _invoiceTrack + _assignlog_lastinvnumbe
        } else if (parseInt(_status) === 12 || parseInt(_status) === 22) {
          //使用中
          var _assignlog_usedcount = _assignLogRecord.getValue({
            fieldId: 'custrecord_gw_assignlog_usedcount'
          })
          _assignlog_usedcount = parseInt(_assignlog_usedcount) + 1
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_usedcount',
            value: _assignlog_usedcount
          })

          var _assignlog_lastinvnumbe = _assignLogRecord.getValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe'
          })

          _assignlog_lastinvnumbe = add(_assignlog_lastinvnumbe, '1')
          _assignlog_lastinvnumbe = padding('' + _assignlog_lastinvnumbe, 8)
          //補0
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe',
            value: _assignlog_lastinvnumbe
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_last_invoice_date',
            value: voucher_date
          })

          _resultNumber = _invoiceTrack + _assignlog_lastinvnumbe

          if (parseInt(_assignlog_usedcount) == 50) {
            if (parseInt(_status) === 12) {
              _assignLogRecord.setValue({
                fieldId: 'custrecord_gw_assignlog_status',
                value: '13'
              })
            } else if (parseInt(_status) === 22) {
              _assignLogRecord.setValue({
                fieldId: 'custrecord_gw_assignlog_status',
                value: '33'
              })
            }
          }

          try {
            var callId = _assignLogRecord.save()
          } catch (e) {
            log.debug(e.name, e.message)
          }
        }
      }
    }
    //alert('_resultNumber='+_resultNumber);
    return _resultNumber
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //取得字軌檔
  function getAssignLogTrack(yearMonth, invoiceType, typeCode) {
    var _resultAry = []
    try {
      var _mySearch = search.create({
        type: _assignLogTrackRecordId,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_track_year_month',
            sort: search.Sort.ASC
          }),
          search.createColumn({ name: 'custrecord_gw_track_type_code' }),
          search.createColumn({ name: 'custrecord_gw_track_invoice_track' }),
          search.createColumn({ name: 'custrecord_gw_track_invoice_type' })
        ]
      })

      var _filterArray = []
      _filterArray.push(['custrecord_gw_track_year_month', 'isnot', '-1'])
      if (yearMonth != '') {
        _filterArray.push('and')
        _filterArray.push(['custrecord_gw_track_year_month', 'is', yearMonth])
      }

      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_track_invoice_type', 'is', invoiceType])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_track_type_code', 'is', typeCode])
      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        var _invoice_track = result.getValue({
          name: 'custrecord_gw_track_invoice_track'
        })
        _resultAry.push(_invoice_track)
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _resultAry
  }

  //檢查號碼重複
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
      if (startNo != '') {
        _filterArray.push('and')
        _filterArray.push([
          [
            'custrecord_gw_assignlog_startno',
            search.Operator.LESSTHANOREQUALTO,
            parseInt(startNo)
          ],
          'and',
          [
            'custrecord_gw_assignlog_endno',
            search.Operator.GREATERTHANOREQUALTO,
            parseInt(startNo)
          ]
        ])
      }
      if (endNo != '') {
        _filterArray.push('and')
        _filterArray.push([
          [
            'custrecord_gw_assignlog_startno',
            search.Operator.LESSTHANOREQUALTO,
            parseInt(endNo)
          ],
          'and',
          [
            'custrecord_gw_assignlog_endno',
            search.Operator.GREATERTHANOREQUALTO,
            parseInt(endNo)
          ]
        ])
      }
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

  //檢查號碼區間
  function checkInvoiceNumberExistRange(businessNo, track, invoiceNumber) {
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
        [
          'custrecord_gw_assignlog_startno',
          search.Operator.LESSTHANOREQUALTO,
          parseInt(invoiceNumber)
        ],
        'and',
        [
          'custrecord_gw_assignlog_endno',
          search.Operator.GREATERTHANOREQUALTO,
          parseInt(invoiceNumber)
        ]
      ])

      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        _isError = true
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _isError
  }

  //檢查號碼重複
  function checkInvoiceNumberDuplicate(businessNo, invoiceNumber) {
    var _isError = false
    try {
      var _mySearch = search.load({
        id: _gwVoucherMainSearchId
      })
      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_seller',
        search.Operator.IS,
        businessNo
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_number',
        search.Operator.IS,
        invoiceNumber
      ])

      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        _isError = true
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _isError
  }

  //檢查字軌存在
  function checkInvoiceTrackExist(
    year_month,
    track,
    format_code,
    invoice_type
  ) {
    var _isError = false
    try {
      var _mySearch = search.create({
        type: _assignLogTrackRecordId,
        columns: [
          search.createColumn({ name: 'custrecord_gw_track_year_month' }),
          search.createColumn({ name: 'custrecord_gw_track_type_code' }),
          search.createColumn({ name: 'custrecord_gw_track_invoice_track' }),
          search.createColumn({ name: 'custrecord_gw_track_invoice_type' })
        ]
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_track_year_month',
        search.Operator.IS,
        year_month
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_track_type_code',
        search.Operator.IS,
        format_code
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_track_invoice_track',
        search.Operator.IS,
        track
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_track_invoice_type',
        search.Operator.IS,
        invoice_type
      ])

      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        _isError = true
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    return _isError
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //取得Customer Deposit Payment
  function getCustomerDepositPaymentBySalesOrderId(idAry) {
    var _payment_amount = 0
    try {
      var _mySearch = search.create({
        type: search.Type.CUSTOMER_DEPOSIT,
        columns: [
          search.createColumn({ name: 'amount' }),
          search.createColumn({ name: 'amountpaid' }),
          search.createColumn({ name: 'custbody_tcm_taxcode' }), //NS 稅別
          search.createColumn({ name: 'custbody_tcm_taxrate' }), //NS 稅率
          search.createColumn({ name: 'custbody_tcm_tax_account' }) //科目
        ]
      })

      var _filterArray = []
      //銷售訂單
      _filterArray.push(['salesorder', search.Operator.ANYOF, idAry])
      _mySearch.filterExpression = _filterArray
      //alert('getCustomerDepositPaymentBySalesOrderId filterArray='+JSON.stringify(_filterArray));
      log.debug('Deposit filterArray', JSON.stringify(_filterArray))

      _mySearch.run().each(function (result) {
        var _amount = result.getValue({
          name: 'amount'
        })
        var _amountpaid = result.getValue({
          name: 'amountpaid'
        })
        //TODO 待確認是否都是含稅金額
        var _tcm_taxrate = result.getValue({
          name: 'custbody_tcm_taxrate'
        })

        _payment_amount += _amount

        return true
      })
    } catch (e) {
      //console.log(e.name+':'+e.message);
      log.debug(
        'Get Error CustomerDepositPaymentBySalesOrderId',
        e.name + ':' + e.message
      )
    }
    return _payment_amount
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //大數相加
  function add(str1, str2) {
    var arr1 = str1.split(''),
      arr2 = str2.split(''),
      extra = false,
      sum,
      res = ''
    while (arr1.length || arr2.length || extra) {
      sum = ~~arr1.pop() + ~~arr2.pop() + extra
      res = (sum % 10) + res
      extra = sum > 9
    }
    return res
  }

  //取得CustomerPosit可折餘額
  function getCustomerDepositBalanceAmount(documentIDAry) {
    var _jsonObjAry = []
    try {
      var _mySearch = search.create({
        type: _gwDepositVoucherRecordId,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_assign_document_id',
            summary: search.Summary.GROUP
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_tax_type',
            summary: search.Summary.GROUP
          }),
          search.createColumn({
            name: 'custrecord_gw_assign_document_number',
            summary: search.Summary.MAX
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_tax_amount',
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_egui_amount',
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'custrecord_gw_deposit_dedcuted_amount',
            summary: search.Summary.SUM
          })
        ]
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_deposit_voucher_status',
        search.Operator.IS,
        'C'
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assign_document_type',
        search.Operator.IS,
        'SALES_ORDER'
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assign_document_id',
        search.Operator.CONTAINS,
        documentIDAry
      ])
      _filterArray.push('and')
      _filterArray.push([
        'sum(formulanumeric:{custrecord_gw_deposit_egui_amount}-{custrecord_gw_deposit_dedcuted_amount})',
        search.Operator.NOTEQUALTO,
        0
      ])

      _mySearch.filterExpression = _filterArray
      log.debug('Customer Deposit _filterArray', JSON.stringify(_filterArray))

      _mySearch.run().each(function (result) {
        var _assign_document_id = result.getValue({
          name: 'custrecord_gw_assign_document_id',
          summary: search.Summary.GROUP
        })
        var _tax_type = result.getValue({
          name: 'custrecord_gw_deposit_egui_tax_type',
          summary: search.Summary.GROUP
        })
        var _assign_document_number = result.getValue({
          name: 'custrecord_gw_assign_document_number',
          summary: search.Summary.MAX
        })
        var _tax_amount = parseInt(
          result.getValue({
            name: 'custrecord_gw_deposit_egui_tax_amount',
            summary: search.Summary.SUM
          })
        )
        /**
        var _amount = parseInt(
          result.getValue({
            name: 'custrecord_gw_deposit_egui_amount',
            summary: search.Summary.SUM
          }),
          10
        )
        */
        var _amount =Math.round( 
          result.getValue({
            name: 'custrecord_gw_deposit_egui_amount',
            summary: search.Summary.SUM
          }))
        
        //_amount=Math.round(_amount)
        
        var _dedcuted_amount = parseInt(
          result.getValue({
            name: 'custrecord_gw_deposit_dedcuted_amount',
            summary: search.Summary.SUM
          }),
          10
        )
        
        var _total_amount = _amount + _tax_amount
        //log.debug('Customer Deposit _filterArray', '_tax_type='+_tax_type+' ,_total_amount='+_total_amount);
        var _jsonObj = {
          assign_document_id: _assign_document_id,
          assign_document_number: _assign_document_number,
          tax_type: _tax_type,
          dedcuted_amount: _dedcuted_amount,
          tax_amount: _tax_amount,
          amount: _amount,
          total_amount: _total_amount
        }

        _jsonObjAry.push(_jsonObj)

        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
    log.debug('Customer Deposit _jsonObjAry', JSON.stringify(_jsonObjAry))
    return _jsonObjAry
  }

  function getAllCustomers() {
    var customers = []
    var s = search.create({
      type: search.Type.CUSTOMER,
      columns: [
        'entityid',
        'companyname',
        'custentity_gw_tax_id_number',
        'address',
        'email'
      ]
    })
    var pagedData = s.runPaged({
      pageSize: 1000
    })
    for (var i = 0; i < pagedData.pageRanges.length; i++) {
      var currentPage = pagedData.fetch(i)
      currentPage.data.forEach(function (result) {
        var _internalid = result.id

        var _entityid = result.getValue({
          name: 'entityid'
        })
        var _name = result.getValue({
          name: 'companyname'
        })
        var _ban = result.getValue({
          name: 'custentity_gw_tax_id_number'
        })
        var _email = result.getValue({
          name: 'email'
        })
        var _address = result.getValue({
          name: 'address'
        })

        var customer = {
          internalid: _internalid,
          entityid: _entityid,
          ban: _ban,
          companyname: _name,
          email: _email,
          address: _address
        }
        customers.push(customer)
      })
    }
    return customers
  }

  function test1(str, length) {
    return (Array(length).join('0') + str).slice(-length)
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //抓設定檔
  function getConfigureValue(group_type, voucher_property_value) {
    var _result = ''
    try {
      var _mySearch = search.create({
        type: _gw_voucher_properties,
        columns: [
          search.createColumn({ name: 'custrecord_gw_voucher_property_id' }),
          search.createColumn({ name: 'custrecord_gw_voucher_property_value' }),
          search.createColumn({ name: 'custrecord_gw_voucher_property_note' }),
          search.createColumn({ name: 'custrecord_gw_netsuite_id_value' }),
          search.createColumn({ name: 'custrecord_gw_netsuite_id_text' })
        ]
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_voucher_group_type',
        search.Operator.IS,
        group_type
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_property_id',
        search.Operator.IS,
        voucher_property_value
      ])

      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        var internalid = result.id
        _result = result.getValue({
          name: 'custrecord_gw_voucher_property_value'
        })
        return true
      })
    } catch (e) {
      //console.log(e.name + ':' + e.message)
    }

    return _result
  }

  //申報期別選項
  function getApplyPeriodOptionId(year_month) {
    var _internalid = -1
    try {
      var _mySearch = search.create({
        type: 'customrecord_gw_apply_period_options',
        columns: [
          search.createColumn({ name: 'custrecord_gw_apply_period_value' }),
          search.createColumn({ name: 'custrecord_gw_apply_period_text' })
        ]
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_apply_period_value',
        search.Operator.IS,
        year_month
      ])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        _internalid = result.id
        return true
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _internalid
  }

  //檢查稅差(float, float, float,float), ns_tax_rate=0.05
  function checkTaxDifference(
    ns_sales_amount,
    ns_tax_rate,
    ns_tax_amount,
    tax_diff_balance
  ) {
    var _result = false
    try {
      var _ns_tax_amount = Math.round(ns_tax_amount)
      var _gw_tax_amount = Math.round(ns_sales_amount * ns_tax_rate)
      if (Math.abs(_gw_tax_amount - _ns_tax_amount) > tax_diff_balance)
        _result = true
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    return _result
  }

  //取得統編
  function getCustomerBAN(customer_id) {
    var _ban = ''
    try {
      var _fieldLookUp = search.lookupFields({
        type: search.Type.CUSTOMER,
        id: customer_id,
        columns: [
          'entityid',
          'companyname',
          'custentity_gw_tax_id_number',
          'vatregnumber',
          'address',
          'email'
        ]
      })
      log.debug('_fieldLookUp', JSON.stringify(_fieldLookUp))
      _ban = _fieldLookUp.custentity_gw_tax_id_number
      if (_ban == '') _ban = '0000000000'
    } catch (e) {
      log.debug('getCustomerBAN Error', e.name + ':' + e.message)
    }

    return _ban
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //20210510 walter modify
  function getSellerInfoBySubsidiary(subsidiary) {
    var _comapny_ary = []

    var _businessSearch = search
      .create({
        type: 'customrecord_gw_business_entity',
        columns: [
          'custrecord_gw_be_tax_id_number',
          'custrecord_gw_be_gui_title',
          'custrecord_gw_be_ns_subsidiary',
          'custrecord_gw_business_entity_role_list'
        ],
        filters: ['custrecord_gw_be_ns_subsidiary', 'is', subsidiary]
      })
      .run()
      .each(function (result) {
        var _internalid = result.id

        var _tax_id_number = result.getValue({
          name: 'custrecord_gw_be_tax_id_number'
        })
        var _be_gui_title = result.getValue({
          name: 'custrecord_gw_be_gui_title'
        })
        var _be_ns_subsidiary = result.getValue({
          name: 'custrecord_gw_be_ns_subsidiary'
        })

        var _business_entity_role_list = result.getValue({
          name: 'custrecord_gw_business_entity_role_list'
        })

        var _obj = {
          tax_id_number: _tax_id_number,
          be_gui_title: _be_gui_title,
          subsidiary: _be_ns_subsidiary,
          business_entity_role_list: _business_entity_role_list
        }

        _comapny_ary.push(_obj)

        return true
      })

    return _comapny_ary
  }

  //透過user_id取得資料營業人清單
  function getBusinessEntityByUserId(currentUserObject) {
    var companyArray = []

    var userRole = currentUserObject.role
    var recordType = 'customrecord_gw_business_entity'
    var searchColumns = []
    searchColumns.push('custrecord_gw_be_tax_id_number')
    searchColumns.push('custrecord_gw_be_gui_title')
    searchColumns.push('custrecord_gw_be_ns_subsidiary')
    var searchFilters = []
    searchFilters.push(['custrecord_gw_business_entity_role_list', 'anyof', userRole])
    var getBusinessEntitySearchObject = search.create({
      type: recordType,
      columns: searchColumns,
      filters: searchFilters
    })

    getBusinessEntitySearchObject.run().each(function (result) {
      log.debug({title: 'GET Business Entity result', details: JSON.stringify(result)})

      var _tax_id_number = result.getValue({name: 'custrecord_gw_be_tax_id_number'})
      var _be_gui_title = result.getValue({name: 'custrecord_gw_be_gui_title'})
      var _be_ns_subsidiary = result.getValue({name: 'custrecord_gw_be_ns_subsidiary'})

      companyArray.push({
        tax_id_number: _tax_id_number,
        be_gui_title: _be_gui_title,
        subsidiary: _be_ns_subsidiary
      })

      return true
    })

    return companyArray
  }

  //取得人員權限清單-255781
  function getUserRolesByUserId(user_id) {
    var _role_ary = []

    var _mySearch = search.load({
      id: 'customsearch_gw_user_roles_search_list'
    })

    var _filterArray = []
    _filterArray.push(['internalid', search.Operator.IS, user_id])
    _mySearch.filterExpression = _filterArray

    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      log.debug('GET user search result: ', JSON.stringify(_result))

      var _role_id = -1
      if (_result.values.role.length != 0) {
        _role_id = _result.values.role[0].value //3
        //_role_text = _result.values.role[0].text //Administrator
      }
      _role_ary.push(_role_id)

      return true
    })

    return _role_ary
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////
  function getVoucherMigType(gw_voucher_type){
	var _mig_type_option = 1	
	try {
      var _mySearch = search.create({
        type: 'customrecord_gw_mig_type',
        columns: [
          search.createColumn({ name: 'custrecord_gw_mt_egui_type' }),
          search.createColumn({ name: 'custrecord_gw_mt_action_mode' }),
          search.createColumn({ name: 'custrecord_gw_mt_bus_tran_type' }),
          search.createColumn({ name: 'custrecord_gw_mt_mig_type' })
        ]
      })

      var _filterArray = []      
      
      if (gw_voucher_type=="ALLOWANCE") gw_voucher_type='Allowance'
    	  
	  _filterArray.push(['custrecord_gw_mt_bus_tran_type', 'is', 'B2C'])
      _filterArray.push('and') 
      _filterArray.push(['custrecord_gw_mt_egui_type', 'is', gw_voucher_type])
      _filterArray.push('and') 
      if (gw_voucher_type=='EGUI'){
    	  _filterArray.push(['custrecord_gw_mt_mig_type', 'is', 'C0401'])
      }else{
    	  _filterArray.push(['custrecord_gw_mt_mig_type', 'is', 'D0401'])
      } 
      //_filterArray.push('and') 
      //_filterArray.push(['custrecord_gw_mt_action_mode', 'is', 'ISSUE'])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
    	  _mig_type_option = result.id 
          return true
      })
    } catch (e) {
      log.error(e.name, e.message)
    }    
    return _mig_type_option
  }
  
  function loadAllTaxInformation() {
    var _taxObjAry = []

    try {
      var _mySearch = search.create({
        type: 'customrecord_gw_ap_doc_tax_type_option',
        columns: [
          search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_value' }), //1
          search.createColumn({ name: 'custrecord_gw_ap_doc_tax_type_text' }), //應稅
          search.createColumn({ name: 'custrecord_gw_tax_type_tax_code' }) //TAX CODES
        ]
      })

      //var _filterArray = []
      //_filterArray.push(['custrecord_gw_voucher_group_type', 'is', _group_type])
      //_mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        var internalid = result.id

        var _voucher_property_id = 'TAX_TYPE'
        var _voucher_property_value = result.getValue({
          name: 'custrecord_gw_ap_doc_tax_type_value'
        })
        var _voucher_property_note = result.getValue({
          name: 'custrecord_gw_ap_doc_tax_type_text'
        })
        var _netsuite_id_value = result.getValue({
          name: 'custrecord_gw_tax_type_tax_code'
        })
        var _netsuite_id_text = result.getText({
          name: 'custrecord_gw_tax_type_tax_code'
        })

        var _obj = {
          voucher_property_id: _voucher_property_id,
          voucher_property_value: _voucher_property_value,
          voucher_property_note: _voucher_property_note,
          netsuite_id_value: _netsuite_id_value,
          netsuite_id_text: _netsuite_id_text
        }

        _taxObjAry.push(_obj)

        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }

    return _taxObjAry
  }
  

  ////////////////////////////////////////////////////////////////////////////////////////
  //20220802 walter modify
  function getAssignLogNumberAndCheckDuplicate(
	assign_log_ref_internal_id,
    invoice_type,
    ban,
    dept_code,
    classification,
    year_month,
    assignLogType,
    voucher_date
  ) {
    ////////////////////////////////////////////////////////////////////////////////
	//1.先save RefRecord ==>assign_log_ref_internal_id defaultValue=-1
	var _save_ref_record_obj = saveAssignLogRefRecord(assign_log_ref_internal_id,
			                                          invoice_type, 
	                                                  ban, 
	                                                  dept_code,
													  classification,
													  year_month,	
													  assignLogType)
    var _resultNumber = ''
	var _ref_to_do_flag = _save_ref_record_obj.is_to_do
	var _ref_to_do_internal_id = _save_ref_record_obj.internal_id
	 
	if (_ref_to_do_flag==true){
		_resultNumber='BUSY'
		closeAssignLogRefTask(_ref_to_do_internal_id, _resultNumber)
		
		return _resultNumber
	}
	//////////////////////////////////////////////////////////////////////////////// 
    var _assignLogSearch = search.create({
      type: _assignLogRecordId,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'name' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_businessno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_deptcode' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_deptname' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_classification' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_class_name' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_invoicetype' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_invoicetrack' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_startno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_endno' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_yearmonth' }),
        search.createColumn({ name: 'custrecord_gw_last_invoice_date' }),
        search.createColumn({
          name: 'custrecord_gw_assignlog_status',
          sort: search.Sort.DESC
        }),
        search.createColumn({ name: 'custrecord_gw_assignlog_taketime' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_lastinvnumbe' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_reason' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_usedcount' }),
        search.createColumn({ name: 'custrecord_gw_assignlog_version' })
      ]
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_assignlog_businessno',
      search.Operator.IS,
      ban
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_egui_format_code',
      search.Operator.IS,
      invoceFormatCode
    ])
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_assignlog_invoicetype',
      search.Operator.IS,
      invoice_type
    ])

    if (dept_code === '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_deptcode',
        search.Operator.ISEMPTY,
        ''
      ])
    } else {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_deptcode',
        search.Operator.IS,
        dept_code
      ])
    }
    if (classification === '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        search.Operator.ISEMPTY,
        ''
      ])
    } else {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_classification',
        search.Operator.IS,
        classification
      ])
    }
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_assignlog_yearmonth',
      search.Operator.IS,
      year_month
    ])

    //檢查日期資料(申請日期要大於字軌日期)
    //_filterArray.push('and')
    //_filterArray.push(['custrecord_gw_last_invoice_date',search.Operator.LESSTHANOREQUALTO, parseInt(voucher_date)]);
    /**
	_filterArray.push([
      [
        'custrecord_gw_last_invoice_date',
        search.Operator.LESSTHANOREQUALTO,
        parseInt(voucher_date),
      ],
      'or',
      ['custrecord_gw_last_invoice_date', search.Operator.EQUALTO, 0],
    ])
    */
    _filterArray.push('and')
    if (assignLogType !== 'NONE') {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '11'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '12']
      ])
    } else {
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '21'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '22']
      ])
    }
    //alert('Parse 11 _filterArray='+JSON.stringify(_filterArray));
    _assignLogSearch.filterExpression = _filterArray

    var _assignLogSearchResult = _assignLogSearch.run().getRange({
      start: 0,
      end: 1
    })

    for (var i = 0; i < _assignLogSearchResult.length; i++) {
      var _internalid = _assignLogSearchResult[i].id
      //alert('_assignLogSearchResult[i]='+JSON.stringify(_assignLogSearchResult[i]));
      var _lastInvoiceDate = _assignLogSearchResult[i].getValue({
        name: 'custrecord_gw_last_invoice_date'
      })

      if (parseInt(voucher_date) >= parseInt(_lastInvoiceDate)) {
        var _status = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_status'
        })
        var _startNo = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_startno'
        })
        _startNo = padding('' + _startNo, 8)

        var _lastinvnumbe = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_lastinvnumbe'
        })
        var _invoiceTrack = _assignLogSearchResult[i].getValue({
          name: 'custrecord_gw_assignlog_invoicetrack'
        })

        var _assignLogRecord = record.load({
          type: _assignLogRecordId,
          id: _internalid,
          isDynamic: true
        })

        if (parseInt(_status) === 11 || parseInt(_status) === 21) {
          //新字軌
          var _assignlog_lastinvnumbe = _startNo
          if (parseInt(_status) === 11) {
            _assignLogRecord.setValue({
              fieldId: 'custrecord_gw_assignlog_status',
              value: '12'
            })
          } else if (parseInt(_status) === 21) {
            _assignLogRecord.setValue({
              fieldId: 'custrecord_gw_assignlog_status',
              value: '22'
            })
          }
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe',
            value: _assignlog_lastinvnumbe
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_usedcount',
            value: '1'
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_last_invoice_date',
            value: voucher_date
          })

          try {
            var callId = _assignLogRecord.save()
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }

          _resultNumber = _invoiceTrack + _assignlog_lastinvnumbe
        } else if (parseInt(_status) === 12 || parseInt(_status) === 22) {
          //使用中
          var _assignlog_usedcount = _assignLogRecord.getValue({
            fieldId: 'custrecord_gw_assignlog_usedcount'
          })
          _assignlog_usedcount = parseInt(_assignlog_usedcount) + 1
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_usedcount',
            value: _assignlog_usedcount
          })

          var _assignlog_lastinvnumbe = _assignLogRecord.getValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe'
          })

          _assignlog_lastinvnumbe = add(_assignlog_lastinvnumbe, '1')
          _assignlog_lastinvnumbe = padding('' + _assignlog_lastinvnumbe, 8)
          //補0
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_assignlog_lastinvnumbe',
            value: _assignlog_lastinvnumbe
          })
          _assignLogRecord.setValue({
            fieldId: 'custrecord_gw_last_invoice_date',
            value: voucher_date
          })

          _resultNumber = _invoiceTrack + _assignlog_lastinvnumbe

          if (parseInt(_assignlog_usedcount) == 50) {
            if (parseInt(_status) === 12) {
              _assignLogRecord.setValue({
                fieldId: 'custrecord_gw_assignlog_status',
                value: '13'
              })
            } else if (parseInt(_status) === 22) {
              _assignLogRecord.setValue({
                fieldId: 'custrecord_gw_assignlog_status',
                value: '33'
              })
            }
          }

          try {
            var callId = _assignLogRecord.save()
          } catch (e) {
            log.debug(e.name, e.message)
          }
        }
      }
    }
    
    if(_ref_to_do_internal_id != -1)closeAssignLogRefTask(_ref_to_do_internal_id, _resultNumber)
    //alert('_resultNumber='+_resultNumber);
    return _resultNumber
  }
  
  //create assignLogRefRecord  
  function saveAssignLogRefRecord(assign_log_ref_internal_id,
		                          invoice_type,
								  seller,
								  dept_code,
								  classification,
								  year_month,
								  assign_log_type){	 
	  
	  var _internal_id = assign_log_ref_internal_id
	  var _voucher_type='EGUI' 
	  //create record and get internal_id START	 
	  if (_internal_id == -1)	{		  
		  var _assignLogRefRecord = record.create({
		      type: _assignLogRefRecordId,
		      isDynamic: true
		  })
		  
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_voucher_type', value: _voucher_type})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_invoice_type', value: invoice_type})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_seller', value: seller})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_dept_code', value: dept_code})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_classification', value: classification})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_year_month', value: year_month})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_assign_log_type', value: assign_log_type})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_is_closed', value: 'N'})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_invoice_number', value: ''})
		  _assignLogRefRecord.setValue({ fieldId: 'custrecord_gw_asref_timestamp', value: getNowMinutes(0)})
		  try {
			   _internal_id = _assignLogRefRecord.save() 			  
	      } catch (e) {
	           console.log(e.name + ':' + e.message)	           
	      }	 
	  }
	   
	  //create record and get internal_id END
	  var _is_to_do = searchToDoAssignLogTask(_internal_id,
						                      _voucher_type,
							                  invoice_type,
										      seller,
										      dept_code,
										      classification,
										      year_month,
										      assign_log_type)
       
	  return {'is_to_do':_is_to_do, 'internal_id':_internal_id}
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  //檢查to_do_task=N 是否還有沒做完的  
  function searchToDoAssignLogTask(internal_id,
		                           voucher_type,
		                           invoice_type,
								   seller,
								   dept_code,
								   classification,
								   year_month,
								   assign_log_type) {
	  
	  var _period_minutes=15
	  var _is_to_do=false
	  var _min_internalid = -1
      //search record count>1 START
	  var _search = search.create({
	      type: _assignLogRefRecordId,
	      columns: [  
	        search.createColumn({
	            name: 'custrecord_gw_asref_voucher_type',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_invoice_type',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_seller',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_dept_code',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_classification',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_year_month',
	            summary: search.Summary.GROUP
	        }),
	        search.createColumn({
	            name: 'custrecord_gw_asref_assign_log_type',
	            summary: search.Summary.GROUP
	        }),  
	        search.createColumn({
	            name: 'internalid',
	            summary: search.Summary.MIN
	        })
	      ]
	  })

	  var _filterArray = []
	  _filterArray.push(['custrecord_gw_asref_voucher_type',search.Operator.IS,voucher_type])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_invoice_type',search.Operator.IS,invoice_type])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_seller',search.Operator.IS,seller])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_dept_code',search.Operator.IS,dept_code])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_classification',search.Operator.IS,classification])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_year_month',search.Operator.IS,year_month])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_assign_log_type',search.Operator.IS,assign_log_type])
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_is_closed',search.Operator.IS,'N'])	  
	  _filterArray.push('and')
	  _filterArray.push(['custrecord_gw_asref_timestamp',search.Operator.GREATERTHANOREQUALTO, getNowMinutes(_period_minutes)]) 

	  _search.filterExpression = _filterArray	  
	  //alert(' filterArray='+JSON.stringify(_filterArray));
	  _search.run().each(function (result) {
	   	  _min_internalid = result.getValue({
	          name: 'internalid',
	          summary: search.Summary.MIN
	      })
	      
	      return true
	  })
	  	  
	  //search record count>1 END
	  if (_min_internalid != -1 && internal_id != _min_internalid){
		  _is_to_do=true  		 
		  //setTimeout('console.log("Wait 3 seconds!")', 3000)
	  }	  
	   
	  return _is_to_do
  }

  function getNowMinutes(minutes){
     var date = new Date();	 
	 date.setMinutes(date.getMinutes() - minutes)
	  
	 var _year=date.getFullYear()+''
	 var _month=(date.getMonth()+1)<10?'0'+(date.getMonth()+1):(date.getMonth()+1)+''
	 var _date=date.getDate()<10?'0'+date.getDate():date.getDate()+''
	 var _hours=date.getHours()<10?'0'+date.getHours():date.getHours()+''
	 var _minutes=date.getMinutes()<10?'0'+date.getMinutes():date.getMinutes()+''
	  
	 return parseFloat(_year+_month+_date+_hours+_minutes)
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  //close task
  function closeAssignLogRefTask(internal_id, invoice_number) {
	  var values = {}
      values['custrecord_gw_asref_invoice_number'] = invoice_number
      values['custrecord_gw_asref_is_closed'] = 'Y'
      var _id = record.submitFields({
          type: _assignLogRefRecordId,
          id: internal_id,
          values: values,
          options: {
             enableSourcing: false,
             ignoreMandatoryFields: true
          }
      })
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //檢查外部號碼區間
  function checkInvoiceManualNumberExistRange(businessNo, year_month, track, invoiceNumber, format_code, invoice_type) {
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
        'custrecord_gw_egui_format_code',
        search.Operator.IS,
        format_code
      ])
      
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_yearmonth',
        search.Operator.IS,
        year_month
      ]) 
      
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_invoicetype',
        search.Operator.IS,
        invoice_type
      ])
      
      _filterArray.push('and')       
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.ISNOT, '13'],
        'and',
        ['custrecord_gw_assignlog_status', search.Operator.ISNOT, '23'],
        'and',
    	['custrecord_gw_assignlog_status', search.Operator.ISNOT, '33'] 
      ])    
       
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_assignlog_invoicetrack',
        search.Operator.IS,
        track
      ])
      _filterArray.push('and')
      _filterArray.push([
        [
          'custrecord_gw_assignlog_startno',
          search.Operator.LESSTHANOREQUALTO,
          parseInt(invoiceNumber)
        ],
        'and',
        [
          'custrecord_gw_assignlog_endno',
          search.Operator.GREATERTHANOREQUALTO,
          parseInt(invoiceNumber)
        ]
      ])

      _mySearch.filterExpression = _filterArray
      
      var _index_invoice_number = 0
      if(invoiceNumber.length==10){
    	 _index_invoice_number = parseInt(invoiceNumber.substring(2,invoiceNumber.length))
      }else{
    	 _index_invoice_number = parseInt(invoiceNumber)
      }
      
      _mySearch.run().each(function (result) {
    	  var _internalId = result.id
    	  
    	  var _record = record.load({
    	        type: 'customrecord_gw_assignlog',
    	        id: _internalId,
    	        isDynamic: true
    	  })  
    	 
    	  var _gw_assignlog_status = _record.getValue({fieldId: 'custrecord_gw_assignlog_status'})
    	  var _gw_assignlog_usedcount = _record.getValue({fieldId: 'custrecord_gw_assignlog_usedcount'})
    	 
    	  var _assignlog_startno = _record.getValue({fieldId: 'custrecord_gw_assignlog_startno'})
    	  var _assignlog_endno = _record.getValue({fieldId: 'custrecord_gw_assignlog_endno'})
    	  var _last_invoice_number = _record.getValue({fieldId: 'custrecord_gw_assignlog_lastinvnumbe'})
          
    	  var _check_invoice_number = 0
          if (_last_invoice_number!=''){
        	  _check_invoice_number = parseInt(_last_invoice_number)
          }
    	  if (_index_invoice_number >= _check_invoice_number){	
    		  _record.setValue({
	  		        fieldId: 'custrecord_gw_assignlog_lastinvnumbe',
	  		        value: _index_invoice_number
	  		  })
    	  }
    	  _record.setValue({
		        fieldId: 'custrecord_gw_assignlog_usedcount',
		        value: _index_invoice_number-_assignlog_startno+1
		  })
    	  if (_gw_assignlog_status=='21' || _gw_assignlog_status=='31'){ 
		     _record.setValue({
		        fieldId: 'custrecord_gw_assignlog_status',
		        value: (parseInt(_gw_assignlog_status)+1).toString()
		     })
    	  }
    	  
    	  
    	  _record.save()
    	  _isError = true
          return true
      })
       
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
     
    return _isError
  }
  
  function getManualOpenID() {
    return 'MI' 
  }

  /////////////////////////////////////////////////////////////////////////////////////////////

  return {
    getBusinessEntitByUserId: getBusinessEntityByUserId,
    loadAllTaxInformation: loadAllTaxInformation,
    getApplyPeriodOptionId: getApplyPeriodOptionId,
    getCustomerBAN: getCustomerBAN,
    checkTaxDifference: checkTaxDifference,
    getConfigureValue: getConfigureValue,
    getAllCustomers: getAllCustomers,
    getCustomerDepositBalanceAmount: getCustomerDepositBalanceAmount,
    getCustomerDepositPaymentBySalesOrderId: getCustomerDepositPaymentBySalesOrderId,
    checkInvoiceTrackExist: checkInvoiceTrackExist,
    checkInvoiceNumberDuplicate: checkInvoiceNumberDuplicate,
    checkInvoiceNumberExistRange: checkInvoiceNumberExistRange,
    checkAssignLogDuplicate: checkAssignLogDuplicate,
    getAssignLogTrack: getAssignLogTrack,
    getInvoiceTypeDesc: getInvoiceTypeDesc,
    getMigTypeDesc: getMigTypeDesc,
    getMigType: getMigType,
    getVoucherStatusDesc: getVoucherStatusDesc,
    getUploadStatusDesc: getUploadStatusDesc,
    getAllowanceNumber: getAllowanceNumber,
    getAssignLogNumber: getAssignLogNumber,
    getRandomNum: getRandomNum,
    getSellerInfoBySubsidiary: getSellerInfoBySubsidiary,
	getRandomNumNew: getRandomNumNew,
	checkInvoiceManualNumberExistRange: checkInvoiceManualNumberExistRange,
    getAssignLogNumberAndCheckDuplicate: getAssignLogNumberAndCheckDuplicate,
    getAllowanceTaxCode: getAllowanceTaxCode,
    getManualOpenID: getManualOpenID,
    getPrintMark: getPrintMark,
	getVoucherMigType: getVoucherMigType,
  }
})