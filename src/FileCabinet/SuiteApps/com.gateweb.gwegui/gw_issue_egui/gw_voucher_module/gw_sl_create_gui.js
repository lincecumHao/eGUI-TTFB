/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/format',
    'N/record',
    'N/runtime',
    'N/search',
    '../gw_common_utility/gw_common_date_utility',
    '../../gw_issue_egui/gw_common_utility/gw_common_string_utility',
    '../../gw_issue_egui/gw_common_utility/gw_common_configure',
    '../../gw_issue_egui/gw_common_utility/gw_common_invoice_utility'
  ],
  /**
   * @param{format} format
   * @param{record} record
   * @param{runtime} runtime
   * @param{search} search
   */
  (format,
   record,
   runtime,
   search,
   dateutility,
   stringutility,
   gwconfigure,
   invoiceutility) => {

    function onRequest(context) {
      if (context.request.method === 'POST') {// let requestData = JSON.parse(context.request.body);
        let requestData = JSON.parse(context.request.body)

        log.debug('mainObj', requestData['mainObj']);
        log.debug('jsonDocumemtLists',requestData['jsonDocumemtLists']);

        let result = saveEguiData(requestData['mainObj'], requestData['jsonDocumemtLists'])

        log.debug('response', JSON.stringify(result));
        context.response.write(JSON.stringify(result));
      }
    }

    var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
    var _invoceFormatCode = gwconfigure.getGwVoucherFormatInvoiceCode() //35
    var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數
    var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
    var _credmemo_control_field_id = gwconfigure.getCredMemoControlFieldId()
    var _allowance_pre_code = ''
    var _default_upload_status = 'A' //A->P->C,E
    var _tax_diff_balance = -1
    let saveEguiDataResult = {title: '憑證管理', message: '', eGuiCount: 0, allowanceCount: 0, forward_voucher_main_id: 0}
    let taxObjAry = []

    function saveEguiData(mainObj, jsonDocumemtLists) {
      if (checkInvoiceOrCreditMemoIsLock('customsearch_gw_invoice_detail_search', mainObj.invoice_selected_listid) ||
        checkInvoiceOrCreditMemoIsLock('customsearch_gw_creditmemo_detail_search', mainObj.creditmemo_selected_listid)) {

        saveEguiDataResult.message = '憑證已開立!!!'
        return saveEguiDataResult
      }

      lockOrUnlockRecord(mainObj, true)

      //發票處理-START
      //載入稅別資料
      const _user_id = runtime.getCurrentUser().id
      //共三種不同稅分別為：1.應稅, 2.零稅率, 3.免稅
      const taxTypeCount = 3
      //混合稅代號 9
      const mixedTaxType = 9

      const _year_month = mainObj.year_month //10910
      const _voucher_date = mainObj.select_voucher_date //20201005
      let taxTypeAry = []
      let organisingDocumentObj = {}
      let taxType
      let _requireCount = 0

      _allowance_pre_code = invoiceutility.getConfigureValue('ALLOWANCE_GROUP', 'ALLOWANCE_PRE_CODE')

      taxObjAry = invoiceutility.loadAllTaxInformation()
      _tax_diff_balance = stringutility.convertToInt(invoiceutility.getConfigureValue('TAX_GROUP', 'TAX_DIFF_BALANCE'))

      for (let i = 1; i < taxTypeCount + 1; i++) {
        let eDocumentTaxTypeAry = jsonDocumemtLists['eDocument_TaxType_' + i + '_Ary']

        organisingDocumentObj[i] = organisingDocument(mainObj, eDocumentTaxTypeAry)
        if(eDocumentTaxTypeAry.length > 0) taxTypeAry.push(i)
      }

      //判斷是否為混合稅
      if (taxTypeAry.length === 1) {
        taxType = taxTypeAry[0]
      } else {
        taxType = mixedTaxType
        organisingDocumentObj[mixedTaxType] = organisingDocument(mainObj, jsonDocumemtLists['eDocument_TaxType_9_Ary'])
      }

      //通關註記_沒有零稅率資料須清空
      if (!taxTypeAry.find((t) => t === 2)) mainObj.customs_clearance_mark = ''

      //檢查折讓金額是否足夠
      for (let i = 0; i < taxTypeAry.length; i++) {
        let checkTaxType = taxTypeAry[i]

        if (organisingDocumentObj[checkTaxType].CREDITMEMO_TOTAL_AMOUNT !== 0) {
          checkCreditMemoAmount(
            mainObj,
            _year_month,
            _voucher_date,
            checkTaxType,
            organisingDocumentObj[checkTaxType].CREDITMEMO_TOTAL_AMOUNT
          )
        }

        _requireCount += organisingDocumentObj[checkTaxType].EGUI.length
      }

      //計算發票筆數
      _requireCount = (mainObj.mig_type === 'B2C' && taxType === mixedTaxType)? organisingDocumentObj['9'].EGUI.length: _requireCount

      if (_requireCount > 0 && stringutility.trim(mainObj.manual_voucher_number) === '') {
        if (checkAssignLogUseCount(
          mainObj,
          _year_month,
          _voucher_date,
          _requireCount
        ) === false) {
          saveEguiDataResult.message += '字軌可開立張數不足或開立日期小於字軌日期,請重新確認!'
        }
      }

      //手開發票檢查
      if (_requireCount > 0 && stringutility.trim(mainObj.manual_voucher_number) !== '') {
        if (checkAssignLogForManual(mainObj, _year_month) === false) {
          saveEguiDataResult.message += '字軌可開立張數不足或開立日期小於字軌日期,請重新確認!'
        }
      }


      //檢查資料-END
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //處理資料-START
      if ( saveEguiDataResult.message !== '') {
        lockOrUnlockRecord(mainObj, false)

        return saveEguiDataResult

      } else {
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //處理要開發票的部分(999筆1包)-START
        let _applyId = saveVoucherApplyListRecord(mainObj, _user_id)

        if (mainObj.mig_type === 'B2C' && taxType === mixedTaxType) {
          //發票
          for (let i = 0; i < organisingDocumentObj[9].EGUI.length; i++) {
            let _documentObj = organisingDocumentObj[9].EGUI
            let _main = _documentObj.main
            _main.tax_type = taxType
            _documentObj.main = _main
            organisingDocumentObj[9].EGUI = _documentObj
          }

          //折讓單
          for (let i = 0; i < organisingDocumentObj[9].CREDITMEMO.length; i++) {
            let _documentObj = organisingDocumentObj[9].CREDITMEMO.length[i]
            let _main = _documentObj.main
            _main.tax_type = taxType
            _documentObj.main = _main
            organisingDocumentObj[9].CREDITMEMO.length[i] = _documentObj
          }
        }

        let _guiNumberAry = []
        let _allowanceNumberAry = []
        let _creditMemoGUINumberAry = []
        let _eGuiCount = 0
        let _allowanceCount = 0
        let organisingDocument = organisingDocumentObj[taxType]

        //開發票
        if (organisingDocument.EGUI.length !== 0) {
          //只開eGUI
          _guiNumberAry = createEGUIDocument(
            mainObj,
            _year_month,
            _applyId,
            organisingDocument.EGUI,
            _voucher_date,
            _user_id
          )
        }
        if  (saveEguiDataResult.message !== '') return saveEguiDataResult

        //2.開折讓單
        if (organisingDocument.CREDITMEMO.length !== 0) {
          //只開Allowance
          let _resultJsonObj = createAllowanceDocument(
            mainObj,
            _year_month,
            _applyId,
            organisingDocument.CREDITMEMO,
            _voucher_date,
            _user_id
          )

          if  (saveEguiDataResult.message !== '') return saveEguiDataResult

          _allowanceNumberAry = _allowanceNumberAry.concat(
            _resultJsonObj.allowanceNumberAry
          )
          _creditMemoGUINumberAry = _creditMemoGUINumberAry.concat(
            _resultJsonObj.creditMemoGUINumberAry
          )
        }

        //更新筆數
        _eGuiCount = _guiNumberAry.length
        _allowanceCount = _allowanceNumberAry.length

        //處理要開發票的部分(999筆1包)-END

        //更新開立張數
        updateVoucherApplyListRecord(_applyId, _eGuiCount, _allowanceCount)
        //更新流程紀錄 flow_status='1'
        if (_eGuiCount + _allowanceCount !== 0)
          updateInvoiceAndCreditMemoFlowStatus(
            mainObj,
            _guiNumberAry,
            _allowanceNumberAry,
            _creditMemoGUINumberAry
          )
        //做完更新資料-END

        //客戶押金已折紀錄 =>[{"assign_document_id":"831","tax_type":"1","dedcuted_amount":952}]
        if (stringutility.trim(mainObj.deposit_voucher_hiddent_listid) !== '') {
          updateVoucherDepositRecord(mainObj.deposit_voucher_hiddent_listid)
        }
        saveEguiDataResult.eGuiCount = _eGuiCount
        saveEguiDataResult.allowanceCount = _allowanceCount
      }

      return saveEguiDataResult
    }

    function checkInvoiceOrCreditMemoIsLock(searchId, selectedList) {
      let _is_lock = false

      try {
        if (selectedList.length !== 0) {
          let _mySearch = search.load({
            id: searchId
          })
          let _filterArray = []
          _filterArray.push(['mainline', search.Operator.IS, true])
          _filterArray.push('and')
          _filterArray.push([
            'custbody_gw_lock_transaction',
            search.Operator.IS,
            true
          ])

          let _internal_id_ary = selectedList.split(',')
          _filterArray.push('and')
          _filterArray.push(['internalid', search.Operator.ANYOF, _internal_id_ary])
          _mySearch.filterExpression = _filterArray

          _mySearch.run().each(function(result) {
            _is_lock = true
            return true
          })
        }
      } catch (e) {
        log.debug(e.name, e.message)
      }

      return _is_lock
    }

    function lockOrUnlockRecord(
      mainObj,
      lock_flag) {
      /////////////////////////////////////////////////////////////////////////
      //發票
      let _invoice_hiddent_listid = mainObj.invoice_selected_listid
      //Update INVOICE
      if (typeof _invoice_hiddent_listid !== 'undefined') {
        let _idAry = _invoice_hiddent_listid.split(',')
        for (let i = 0; i < _idAry.length; i++) {
          let _internalId = _idAry[i]
          if (parseInt(_internalId) > 0) {
            try {
              let values = {}
              values[_invoce_control_field_id] = lock_flag

              if (lock_flag == false) {
                values['custbody_gw_gui_num_start'] = ''
                values['custbody_gw_gui_num_end'] = ''
              }
              let _id = record.submitFields({
                type: record.Type.INVOICE,
                id: parseInt(_internalId),
                values: values,
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              })

            } catch (e) {
              log.debug('lockOrUnlockRecord_error',e.name + ':' + e.message)
            }
          }
        }
      }
      ////////////////////////////////////////////////////////////////////////////////////////
      //折讓單
      let _creditmemo_hiddent_listid = mainObj.creditmemo_selected_listid

      if (typeof _creditmemo_hiddent_listid !== 'undefined') {
        let _idAry = _creditmemo_hiddent_listid.split(',')
        for (let i = 0; i < _idAry.length; i++) {
          let _internalId = _idAry[i]
          if (parseInt(_internalId) > 0) {
            try {
              let values = {}
              values[_credmemo_control_field_id] = lock_flag
              if (lock_flag == false) {
                values['custbody_gw_allowance_num_start'] = ''
                values['custbody_gw_allowance_num_end'] = ''
              }

              let _id = record.submitFields({
                type: record.Type.CREDIT_MEMO,
                id: parseInt(_internalId),
                values: values,
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              })

            } catch (e) {
              log.debug('lockOrUnlockRecord_error',e.name + ':' + e.message)
            }
          }
        }
      }
    }

    function organisingDocument(mainObj, itemAry) {
      let _salesAmountSum = 0
      let _freeSalesAmountSum = 0
      let _zeroSalesAmountSum = 0
      let _taxAmountSum = 0
      let _totalAmountSum = 0
      let _creditMemoTotalAmountSum = 0

      let _guiAry = []
      let _creditMemoAry = []

      let _itemDetails = []
      ////////////////////////////////////////////////////////////////////////////////////
      //1.處理資料=>每999筆開一張發票或折讓單
      let _positive = false
      let _negative = false
      let _tempCheckAry = []

      if (typeof itemAry !== 'undefined') {
        for (let i = 0; i < itemAry.length; i++) {
          let _obj = itemAry[i]

          let _check_document_id = _obj.document_type + _obj.invoice_number
          _itemDetails.push(_obj)

          //alert('_obj.document_type='+_obj.document_type);
          if (
            stringutility.convertToFloat(_obj.item_amount) >= 0 &&
            _obj.document_type !== 'CREDITMEMO'
          ) {
            _positive = true
          } else {
            _negative = true
          }

          let _taxObj = getTaxInformation(_obj.tax_code)

          if (_taxObj.voucher_property_value === '1') {
            //with tax
            _salesAmountSum += stringutility.convertToFloat(_obj.item_amount)
          } else if (_taxObj.voucher_property_value === '2') {
            //zero
            _zeroSalesAmountSum += stringutility.convertToFloat(_obj.item_amount)
          } else if (_taxObj.voucher_property_value === '3') {
            //free
            _freeSalesAmountSum += stringutility.convertToFloat(_obj.item_amount)
          } else {
            _salesAmountSum += stringutility.convertToFloat(_obj.item_amount)
          }

          if (itemAry.length > 999) {
            //超過999筆只能這樣算
            _taxAmountSum += (
              (stringutility.convertToFloat(_obj.item_amount) *
                stringutility.convertToFloat(_obj.tax_rate)) /
              100
            ).toFixed(_numericToFixed)
            //總計金額
            _totalAmountSum =
              _salesAmountSum +
              _zeroSalesAmountSum +
              _freeSalesAmountSum +
              _taxAmountSum
          } else {
            if (_tempCheckAry.toString().indexOf(_check_document_id) === -1) {
              _tempCheckAry.push(_check_document_id)
              //alert('total_tax_amount='+_obj.total_tax_amount+' total_sum_amount = '+_obj.total_sum_amount);
              _taxAmountSum += stringutility.convertToFloat(_obj.total_tax_amount)
              _totalAmountSum += stringutility.convertToFloat(
                _obj.total_sum_amount
              )
            }
          }

          if (i === itemAry.length - 1 || _itemDetails.length === 999) {
            //每999筆開一張發票
            let _main = JSON.parse(JSON.stringify(mainObj))
            let _details = JSON.parse(JSON.stringify(_itemDetails))

            _main.tax_type = _obj.tax_type
            _main.tax_rate = _obj.tax_rate
            _main.zero_sales_amount = _zeroSalesAmountSum.toFixed(_numericToFixed)
            _main.free_sales_amount = _freeSalesAmountSum.toFixed(_numericToFixed)
            _main.sales_amount = _salesAmountSum.toFixed(_numericToFixed)
            _main.tax_amount = _taxAmountSum.toFixed(_numericToFixed)
            _main.total_amount = _totalAmountSum.toFixed(_numericToFixed)
            _main.voucher_open_type = (_positive === true && _negative === true)? 'MIX': 'SINGLE'

            let _itemAry = {
              main: _main,
              details: _details
            }
            if (_totalAmountSum > 0) {
              //開發票
              _guiAry.push(_itemAry)
            } else if (_totalAmountSum < 0) {
              //開折讓單
              _creditMemoAry.push(_itemAry)
              //紀錄累積折讓金額(未稅)
              _creditMemoTotalAmountSum +=
                _salesAmountSum + _zeroSalesAmountSum + _freeSalesAmountSum
            } else {
              //alert('金額為0無須開立!');
              //0元也要開發票
              _guiAry.push(_itemAry)
            }

            _itemDetails.length = 0 // remove all item
            _salesAmountSum = 0
            _zeroSalesAmountSum = 0
            _freeSalesAmountSum = 0
            _taxAmountSum = 0
            _totalAmountSum = 0
            _positive = false
            _negative = false
          }
        }
      }

      let _resultObj = {
        CREDITMEMO_TOTAL_AMOUNT: _creditMemoTotalAmountSum,
        EGUI: _guiAry,
        CREDITMEMO: _creditMemoAry
      }

      return _resultObj
    }

    function checkAssignLogForManual(
      mainObj,
      year_month
    ) {
      try {
        let assignLogSearch = search.create({
          type: 'customrecord_gw_assignlog',
          columns: [
            search.createColumn({ name: 'internalid' }),
            search.createColumn({ name: 'custrecord_gw_assignlog_startno' }),
            search.createColumn({ name: 'custrecord_gw_assignlog_endno' }),
            search.createColumn({ name: 'custrecord_gw_assignlog_lastinvnumbe' })
          ]
        })

        let filterArray = []

        filterArray.push(['custrecord_gw_assignlog_businessno', 'is', mainObj.company_ban])
        filterArray.push('and')
        filterArray.push(['custrecord_gw_egui_format_code', 'is', mainObj.egui_format_code])
        filterArray.push('and')
        filterArray.push(['custrecord_gw_assignlog_invoicetype', 'is', mainObj.invoice_type])
        filterArray.push('and')
        filterArray.push(['custrecord_gw_assignlog_deptcode', 'is' + (mainObj.dept_code ? '' : 'empty'), mainObj.dept_code])
        filterArray.push('and')
        filterArray.push(['custrecord_gw_assignlog_classification', 'is' + (mainObj.classification ? '' : 'empty'), mainObj.classification])
        filterArray.push('and')
        filterArray.push(['custrecord_gw_assignlog_yearmonth', 'is', year_month])
        filterArray.push('and')
        filterArray.push([
          ['custrecord_gw_assignlog_status', search.Operator.IS, '31'],
          'or',
          ['custrecord_gw_assignlog_status', search.Operator.IS, '32'],
          'or',
          ['custrecord_gw_assignlog_status', search.Operator.IS, '33']
        ])
        filterArray.push('and')
        filterArray.push([
          ['custrecord_gw_assignlog_startno', search.Operator.LESSTHANOREQUALTO, parseInt(mainObj.manual_voucher_number.substring(2))],
          'and',
          ['custrecord_gw_assignlog_endno', search.Operator.GREATERTHANOREQUALTO, parseInt(mainObj.manual_voucher_number.substring(2))]
        ])
        log.debug('checkAssignLogForManual_filterArray',filterArray)
        assignLogSearch.filterExpression = filterArray
        assignLogSearch.run().each(function(result) {
          mainObj.assignlog_internalid = result.getValue({
            name: 'internalid'
          })

          mainObj.assignlog_startno = result.getValue({
            name: 'custrecord_gw_assignlog_startno'
          })
          mainObj.assignlog_endno = result.getValue({
            name: 'custrecord_gw_assignlog_endno'
          })
          mainObj.assignlog_lastinvnumbe = result.getValue({
            name: 'custrecord_gw_assignlog_lastinvnumbe'
          })
          return true
        })
      } catch (e) {
        log.debug('checkAssignLogForManual_error' , e.name + ':' + e.message)
      }
      return (mainObj.assignlog_internalid > 0)
    }


    //檢查發票可扣抵金額是否足夠
    /**
     * year_month: 期數
     * disconutTaxType : 折讓稅別 (A0101放 -1 進來)
     * deductionSalesAmount : 扣抵金額(未稅)
     */
    function checkCreditMemoAmount(
      mainObj,
      yearMonth,
      voucher_date,
      disconutTaxType,
      deductionSalesAmount
    ) {
      let _filterArray = []
      let sumSalesMinusDiscount = ''
      let _amountSum = 0
      let taxName = ''

      switch (disconutTaxType) {
        case '1':
          taxName = '應稅'
          sumSalesMinusDiscount = 'sum(formulanumeric:{custrecord_gw_sales_amount}-{custrecord_gw_discount_sales_amount})'
          break
        case '2':
          taxName = '零稅率'
          sumSalesMinusDiscount = 'sum(formulanumeric:{custrecord_gw_zero_sales_amount}-{custrecord_gw_discount_zero_amount})'
          break
        case '3':
          taxName = '免稅'
          sumSalesMinusDiscount = 'sum(formulanumeric:{custrecord_gw_free_sales_amount}-{custrecord_gw_discount_free_amount})'
          break
        default:
        // A0101
      }

      try {
        let _search = search.create({
          type: 'customrecord_gw_voucher_main',
          columns: [
            search.createColumn({
              name: 'custrecord_gw_seller',
              summary: search.Summary.GROUP
            }),
            search.createColumn({
              name: 'custrecord_gw_sales_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_free_sales_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_zero_sales_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_discount_sales_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_discount_free_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_discount_zero_amount',
              summary: search.Summary.SUM
            }),
            search.createColumn({
              name: 'custrecord_gw_discount_amount',
              summary: search.Summary.SUM
            })
          ]
        })

        _filterArray.push([
          'custrecord_gw_voucher_upload_status',
          search.Operator.IS,
          'C'
        ])

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_status',
          search.Operator.IS,
          'VOUCHER_SUCCESS'
        ])

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_type',
          search.Operator.IS,
          'EGUI'
        ])

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_buyer',
          search.Operator.IS,
          mainObj.buyer_identifier
        ])

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_mig_type',
          search.Operator.IS,
          mainObj.mig_type
        ])

        if (mainObj.buyer_identifier === '0000000000') {
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_original_buyer_id',
            search.Operator.IS,
            mainObj.buyer_identifier
          ])
        }

        _filterArray.push('and')
        _filterArray.push(['custrecord_gw_seller',
          search.Operator.IS,
          mainObj.company_ban])

        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_date',
          search.Operator.LESSTHANOREQUALTO,
          parseInt(voucher_date)
        ])

        //指定發票不分Invoice_type
        if (stringutility.trim(mainObj.deduction_egui_number) === '') {
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_invoice_type',
            search.Operator.IS,
            mainObj.invoice_type
          ])
        }

        _filterArray.push('and')
        if (mainObj.tax_type === '2' || mainObj.tax_type === '3') { //免稅(3)及零稅(2)
          _filterArray.push([
            ['custrecord_gw_tax_type', search.Operator.IS, mainObj.tax_type],
            'or',
            ['custrecord_gw_tax_type', search.Operator.IS, '9'] //混合稅
          ])
        } else { //混合稅
          _filterArray.push(['custrecord_gw_tax_amount', search.Operator.GREATERTHAN, 0])
        }

        if (mainObj.allowance_Deduction_Period === 'this_period') {
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_voucher_yearmonth',
            search.Operator.IS,
            yearMonth
          ])
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_voucher_format_code',
            search.Operator.IS,
            gwconfigure.getGwVoucherFormatInvoiceCode()
          ])
        } else if (mainObj.allowance_Deduction_Period === 'early_period') {
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_voucher_yearmonth',
            search.Operator.LESSTHAN,
            yearMonth
          ])
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_voucher_format_code',
            search.Operator.IS,
            gwconfigure.getGwVoucherFormatInvoiceCode()
          ])
        } else {
          //指定發票
          _filterArray.push('and')

          let deduction_egui_number_ary = mainObj.deduction_egui_number.split(',')
          let _filter_ary = []

          for (let i = 0; i < deduction_egui_number_ary.length; i++) {
            let _sub_filter_ary = []

            _sub_filter_ary.push('custrecord_gw_voucher_number')
            _sub_filter_ary.push(search.Operator.IS)
            _sub_filter_ary.push(deduction_egui_number_ary[i])

            if (i > 0) {_filter_ary.push('or')}
            _filter_ary.push(_sub_filter_ary)
          }
          _filterArray.push(_filter_ary)
        }

        _filterArray.push('and')
        _filterArray.push([
          'sum(formulanumeric:{custrecord_gw_sales_amount}+{custrecord_gw_free_sales_amount}+{custrecord_gw_zero_sales_amount}-{custrecord_gw_discount_amount})',
          search.Operator.NOTEQUALTO,
          0
        ])

        if (mainObj.mig_type === 'B2C') {
          _filterArray.push('and')
          _filterArray.push([
            sumSalesMinusDiscount,
            search.Operator.NOTEQUALTO,
            0
          ])
        }

        _search.filterExpression = _filterArray
        //alert('CHK _filterArray='+JSON.stringify(_filterArray));

        _search.run().each(function(result) {
          let _sales_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_sales_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _free_sales_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_free_sales_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _zero_sales_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_zero_sales_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _discount_sales_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_discount_sales_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _discount_free_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_discount_free_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _discount_zero_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_discount_zero_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          let _discount_amount = stringutility.convertToFloat(
            result.getValue({
              name: 'custrecord_gw_discount_amount',
              summary: search.Summary.SUM
            }),
            10
          )

          if (mainObj.mig_type === 'B2C') {
            if (disconutTaxType === '1') {
              _amountSum += _sales_amount - _discount_sales_amount
            } else if (disconutTaxType === '2') {
              _amountSum += _zero_sales_amount - _discount_zero_amount
            } else if (disconutTaxType === '3') {
              _amountSum += _free_sales_amount - _discount_free_amount
            }
          } else {
            _amountSum +=
              _sales_amount +
              _free_sales_amount +
              _zero_sales_amount -
              _discount_amount
          }

          return true
        })

        //因為 deductionSalesAmount 為負數
        if (_amountSum + deductionSalesAmount >= 0) saveEguiDataResult.message += '(' + taxName + ')發票可折金額不足<br>'

      } catch (e) {
        log.debug('checkCreditMemoAmount_error',e.name + ':' + e.message)
      }
    }

    //取得發票字軌可用數量
    function checkAssignLogUseCount(
      mainObj,
      year_month,
      voucher_date,
      requireCount
    ) {
      let _assignLogSearch = search.create({
        type: 'customrecord_gw_assignlog',
        columns: [
          search.createColumn({
            name: 'custrecord_gw_assignlog_businessno',
            summary: search.Summary.GROUP
          }),
          search.createColumn({
            name: 'custrecord_gw_assignlog_startno',
            summary: search.Summary.COUNT
          }),
          search.createColumn({
            name: 'custrecord_gw_last_invoice_date',
            summary: search.Summary.MAX
          }),
          search.createColumn({
            name: 'custrecord_gw_assignlog_usedcount',
            summary: search.Summary.SUM
          })
        ]
      })

      let _filterArray = []
      _filterArray.push(['custrecord_gw_assignlog_businessno', 'is', mainObj.company_ban])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_egui_format_code', search.Operator.IS, mainObj.egui_format_code])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_invoicetype', 'is', mainObj.invoice_type])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_deptcode', 'is' + (mainObj.dept_code? '': 'empty'), mainObj.dept_code])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_classification', 'is' + (mainObj.classification? '': 'empty'), mainObj.classification])
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_assignlog_yearmonth', 'is', year_month])
      _filterArray.push('and')
      _filterArray.push([
        ['custrecord_gw_assignlog_status', search.Operator.IS, '11'],
        'or',
        ['custrecord_gw_assignlog_status', search.Operator.IS, '12']
      ])

      _assignLogSearch.filterExpression = _filterArray
      //alert('GET assign log filterArray: ' + JSON.stringify(_filterArray));
      let _totalCount = 0
      let _noCount = 0
      _assignLogSearch.run().each(function (result) {
        let _businessno = result.getValue({
          name: 'custrecord_gw_assignlog_businessno',
          summary: search.Summary.GROUP
        })
        _noCount += parseInt(
          result.getValue({
            name: 'custrecord_gw_assignlog_startno',
            summary: search.Summary.COUNT
          })
        )
        //
        let _lastInvoiceDate = result.getValue({
          name: 'custrecord_gw_last_invoice_date',
          summary: search.Summary.MAX
        })

        if (parseInt(voucher_date) < parseInt(_lastInvoiceDate)) {
          _noCount = 0
        }

        let _usedCount = parseInt(
          result.getValue({
            name: 'custrecord_gw_assignlog_usedcount',
            summary: search.Summary.SUM
          }),
          10
        )

        _totalCount += 50 - parseInt(_usedCount)

        return true
      })

      return (_totalCount >= parseInt(requireCount) && _noCount !== 0)
    }

    function saveVoucherApplyListRecord(
      mainObj,
      user_id
    ) {
      let _applyId = 0
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //this_period:當期, early_period:前期
      const _voucher_apply_atatus = 'P'
      const _closed_voucher = 'N'

      let _voucherApplyRecord = record.create({
        type: 'customrecord_gw_voucher_apply_list',
        isDynamic: true
      })

      _voucherApplyRecord.setValue({ fieldId: 'name', value: 'VoucherApply' })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_type',
        value: 'APPLY'
      }) //APPLY (開立) / VOID (作廢)
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_open_type',
        value: mainObj.voucher_open_type_apply_list
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_date',
        value: new Date()
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_time',
        value: dateutility.getCompanyLocatTimeForClient()
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_yearmonth',
        value: mainObj.year_month
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_seller',
        value: mainObj.company_ban
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_seller_name',
        value: mainObj.company_name
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_buyer',
        value: mainObj.buyer_identifier
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_buyer_name',
        value: mainObj.buyer_name
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_dept_code',
        value: mainObj.dept_code
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_dept_name',
        value: mainObj.dept_code
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_class',
        value: mainObj.classification
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_invoice_type',
        value: mainObj.invoice_type
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_mig_type',
        value: mainObj.mig_type
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_gui_yearmonth_type',
        value: mainObj.allowance_Deduction_Period
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_status',
        value: _voucher_apply_atatus
      })

      //作廢時使用
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_void_comment',value:dateutility.getCompanyLocatDateForClient()});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_approve_comment',value:dateutility.getCompanyLocatTimeForClient()});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_voucher_flow_status',value:_yearMonth});
      //_voucherApplyRecord.setValue({fieldId:'custrecord_gw_source_apply_internal_id',value:_yearMonth});

      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_closed_voucher',
        value: _closed_voucher
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_discountamount',
        value: mainObj.discount_amount
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_sales_amount',
        value: mainObj.sales_amount
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_tax_amount',
        value: mainObj.tax_amount
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_tax_type',
        value: mainObj.tax_type
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_tax_rate',
        value: mainObj.tax_rate
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_total_amount',
        value: mainObj.total_amount
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_invoice_apply_list',
        value: mainObj.invoice_selected_listid
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_creditmemo_apply_list',
        value: mainObj.creditmemo_selected_listid
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_mig',
        value: mainObj.assign_log_type
      })
      _voucherApplyRecord.setValue({
        fieldId: 'custrecord_gw_voucher_apply_userid',
        value: user_id
      })

      try {
        _applyId = _voucherApplyRecord.save()
        mainObj.applyID = _applyId
      } catch (e) {
        log.debug('saveVoucherApplyListRecord',e.name + ':' + e.message)
      }

      return _applyId
    }

    function createEGUIDocument(
      mainObj,
      year_month,
      applyId,
      documentAry,  // _organisedAry_TaxType_1.EGUI
      voucher_date,
      user_id
    ) {
      //取得發票號碼 TODO
      let _guiNumberAry = []
      let _mainRecordId = 0
      let _voucher_type = 'EGUI'

      let _row = 0
      let _status = 'VOUCHER_SUCCESS' //2:開立成功, 3:作廢成功
      let _documentTime = dateutility.getCompanyLocatTimeForClient()

      let _applyPeriod = invoiceutility.getApplyPeriodOptionId(year_month)

      if (typeof documentAry !== 'undefined') {
        for (let i = 0; i < documentAry.length; i++) {
          let _documentObj = documentAry[i]
          let _main = _documentObj.main
          let _details = _documentObj.details
          let _tax_diff_error = checkVoucherTaxDifference(_details)

          if (stringutility.convertToFloat(_main.tax_amount) < 0)
            _tax_diff_error = true

          if (_tax_diff_error === true) {
            saveEguiDataResult.title = '發票管理'
            saveEguiDataResult.message = '稅差超過(' + _tax_diff_balance + ')元 ,請重新調整!'

            lockOrUnlockRecord(mainObj,false)

            return
          }

          ////////////////////////////////////////////////////////////////////////////////////////////////////////////
          //取得發票號碼 TODO
          //統編[24549210]+部門代碼[2]+期數[10908]
          let _invoiceNumber = ''
          if (stringutility.trim(mainObj.manual_voucher_number) !== '') {
            _invoiceNumber = mainObj.manual_voucher_number

            invoiceutility.setAssignLogNumberForManual(voucher_date, mainObj)

          } else {
            _invoiceNumber = invoiceutility.getAssignLogNumberAndCheckDuplicate(
              -1,
              _main.invoice_type,
              _main.company_ban,
              _main.dept_code,
              _main.classification,
              year_month,
              mainObj.assign_log_type,
              voucher_date
            )
          }

          if (mainObj.assign_log_type === 'NONE') {
            _default_upload_status = 'C'
          }

          if (_invoiceNumber.length === 0 || _invoiceNumber === 'BUSY') {
            saveEguiDataResult.title = _invoiceNumber === 'BUSY'? '憑證管理': '字軌管理'
            saveEguiDataResult.message = _invoiceNumber === 'BUSY'? '本期(' + year_month + ')字軌使用忙碌,請稍後再開立!': '無本期(' + year_month + ')字軌請匯入或日期小於字軌日期!'

            lockOrUnlockRecord(mainObj,false)

            return
          } else {
            debugger
            _guiNumberAry.push(_invoiceNumber)
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////
            let _voucherMainRecord = record.create({
              type: 'customrecord_gw_voucher_main',
              isDynamic: true
            })

            _voucherMainRecord.setValue({
              fieldId: 'name',
              value: 'VoucherMainRecord'
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_apply_internal_id',
              value: applyId.toString()
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_type',
              value: _voucher_type
            })
            /////////////////////////////////////////////////////////////////
            let _gw_dm_mig_type = invoiceutility.getVoucherMigType(_voucher_type)
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_dm_mig_type',
              value: _gw_dm_mig_type
            })
            /////////////////////////////////////////////////////////////////
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_number',
              value: _invoiceNumber
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_date',
              value: voucher_date
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_time',
              value: _documentTime
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_yearmonth',
              value: year_month
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_voucher_sale_tax_apply_period',
              value: _applyPeriod
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller',
              value: _main.company_ban
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller_name',
              value: _main.company_name
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller_address',
              value: stringutility.trim(_main.company_address)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_original_buyer_id',
              value: stringutility.trim(_main.customer_id)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer',
              value: _main.buyer_identifier
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_name',
              value: _main.buyer_name
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_address',
              value: stringutility.trim(_main.buyer_address)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_email',
              value: stringutility.trim(_main.buyer_email)
            })
            //_voucherMainRecord.setValue({fieldId:'custrecord_gw_buyer_dept_code',value:_main.dept_code});	//暫時不用
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_dept_code',
              value: stringutility.trim(_main.dept_code)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_dept_name',
              value: stringutility.trim(_main.dept_code)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_classification',
              value: stringutility.trim(_main.classification)
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_invoice_type',
              value: stringutility.trim(_main.invoice_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_mig_type',
              value: stringutility.trim(_main.mig_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_format_code',
              value: stringutility.trim(_main.egui_format_code)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrier_type',
              value: stringutility.trim(_main.carrier_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrierid1',
              value: stringutility.trim(_main.carrier_id_1)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrierid2',
              value: stringutility.trim(_main.carrier_id_2)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_npoban',
              value: stringutility.trim(_main.npo_ban)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_clearance_mark',
              value: stringutility.trim(_main.customs_clearance_mark)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_main_remark',
              value: stringutility.trim(_main.main_remark)
            })

            let _print_mark = invoiceutility.getPrintMark(
              _main.npo_ban,
              _main.carrier_type,
              _main.buyer_identifier
            )
            //捐贈碼 OR 載具編號
            let _random_number = invoiceutility.getRandomNumNew(
              _invoiceNumber,
              _main.company_ban
            )
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_random_number',
              value: _random_number
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_print_mark',
              value: _print_mark
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_is_printed',
              value: 'N'
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_lock_transaction',
              value: true
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_discount_amount',
              value: 0
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_discount_count',
              value: '0'
            })
            //_voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_owner',value:'1'}); //折讓單專用欄位(1:買方, 2賣方)
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_status',
              value: _status
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_upload_status',
              value: _default_upload_status
            })
            //NE-338
            _default_upload_status = 'A'

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_sales_amount',
              value: stringutility.convertToFloat(_main.sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_free_sales_amount',
              value: stringutility.convertToFloat(_main.free_sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_zero_sales_amount',
              value: stringutility.convertToFloat(_main.zero_sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_amount',
              value: _main.tax_amount
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_type',
              value: _main.tax_type
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_rate',
              value: stringutility.convertToFloat(_main.tax_rate) / 100
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_total_amount',
              value: _main.total_amount
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_need_upload_egui_mig',
              value: mainObj.assign_log_type
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_main_apply_user_id',
              value: user_id
            })

            let voucherDetailSublistId = 'recmachcustrecord_gw_voucher_main_internal_id'
            let _gw_ns_document_apply_id_ary = []

            if (typeof _details !== 'undefined') {
              for (let j = 0; j < _details.length; j++) {
                let _obj = _details[j]

                _voucherMainRecord.selectNewLine({
                  sublistId: voucherDetailSublistId
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'name',
                  value: 'VoucherDetailRecord'
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_apply_internal_id',
                  value: applyId.toString()
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_voucher_main_internal_id',
                  value: _mainRecordId.toString()
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_type',
                  value: _voucher_type
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_description',
                  value: stringutility.trim(_obj.item_name)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_unit_price',
                  value: stringutility.trim(_obj.unit_price)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_unit',
                  value: stringutility.trim(_obj.item_unit)
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_quantity',
                  value: stringutility.trim(_obj.item_quantity)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_amount',
                  value: stringutility.trim(_obj.item_amount)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_tax_amount',
                  value: stringutility.trim(_obj.item_tax_amount)
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_total_amount',
                  value: stringutility.trim(_obj.item_total_amount)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_item_tax_code',
                  value: stringutility.trim(_obj.tax_code)
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_item_tax_rate',
                  value: stringutility.trim(_obj.tax_rate)
                })

                _row++
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_seq',
                  value: _row.toString()
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_item_remark',
                  value: stringutility.trim(_obj.item_remark)
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_number',
                  value: _invoiceNumber
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_date',
                  value: voucher_date
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_time',
                  value: _documentTime
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_yearmonth',
                  value: year_month
                })

                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_status',
                  value: _status
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_upload_status',
                  value: _default_upload_status
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_document_type',
                  value: _obj.document_type
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_document_apply_id',
                  value: _obj.invoice_id
                })
                if (
                  _gw_ns_document_apply_id_ary.toString().indexOf(_obj.invoice_id) === -1
                ) {
                  _gw_ns_document_apply_id_ary.push(_obj.invoice_id)
                }
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_document_number',
                  value: _obj.invoice_number
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_document_item_id',
                  value: _obj.invoice_seq
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_document_items_seq',
                  value: _obj.invoice_seq
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_item_discount_amount',
                  value: '0'
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_ns_item_discount_count',
                  value: '0'
                })
                //20210113 walter modify
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_voucher_apply_period',
                  value: _applyPeriod
                })
                _voucherMainRecord.setCurrentSublistValue({
                  sublistId: voucherDetailSublistId,
                  fieldId: 'custrecord_gw_dtl_item_relate_number',
                  value: _obj.itemRelateNumber
                })
                _voucherMainRecord.commitLine({
                  sublistId: voucherDetailSublistId
                })
              }
            }
            //End Details
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_is_completed_detail',
              value: true
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_ns_transaction',
              value: _gw_ns_document_apply_id_ary
            })

            try {
              _mainRecordId = _voucherMainRecord.save()

              saveEguiDataResult.forward_voucher_main_id = _mainRecordId
            } catch (e) {
              log.debug('createEGUIDocument_error',e.name + ':' + e.message)
            }
          }
        }
      }
      return _guiNumberAry
    }

    function createAllowanceDocument(
      mainObj,
      year_month,
      applyId,
      documentAry,
      voucher_date,
      user_id
    ) {
      //取得發票號碼
      let _allowanceNumberAry = []
      //放Credit Memo對應的GUI號碼
      let _creditMemoGUINumberAry = []
      let _mainRecordId = 0
      let _voucher_type = 'ALLOWANCE'
      let _row = 0
      let _status = 'VOUCHER_SUCCESS' //2:開立成功, 3:作廢成功
      let _documentDate = voucher_date
      let _documentTime = dateutility.getCompanyLocatTimeForClient()
      let _applyPeriod = invoiceutility.getApplyPeriodOptionId(year_month)
      let taxTypeNameObj = { 1: '應稅', 2: '零稅', 3: '免稅' }
      let _creditMemoFormatCode = gwconfigure.getGwVoucherFormatAllowanceCode()
      let _net_value = -1

      if (typeof documentAry !== 'undefined') {
        for (let i = 0; i < documentAry.length; i++) {
          let _documentObj = documentAry[i]
          let _main = _documentObj.main
          let _details = _documentObj.details //999筆1包
          let salesAmountAry = []

          //要放正值進入扣抵
          salesAmountAry.push(Math.abs(stringutility.convertToFloat(_main.sales_amount)))
          salesAmountAry.push(Math.abs(stringutility.convertToFloat(_main.zero_sales_amount)))
          salesAmountAry.push(Math.abs(stringutility.convertToFloat(_main.free_sales_amount)))

          //撈庫存發票
          let _history_Deduction_EGUIItems = []
          let deductionEGUIItemsType

          for (let j = 0; j < salesAmountAry.length; j++) {
            let checkField = j + 1

            if (salesAmountAry[j] !== 0) {
              deductionEGUIItemsType = geteGUIDeductionItems(
                mainObj.mig_type,
                mainObj.assign_log_type,
                _main.customer_id,
                _main.buyer_identifier,
                _main.company_ban,
                _main.dept_code,
                _main.classification,
                _main.year_month,
                voucher_date,
                _main.gui_yearmonth_type,
                mainObj.deduction_egui_number,
                _main.invoice_type,
                _main.tax_type,
                checkField,
                salesAmountAry[j]
              )

              if (deductionEGUIItemsType.checkResult === false) {
                saveEguiDataResult.message += '折讓單(' + taxTypeNameObj[checkField] + ')可扣抵發票金額不足!'
              } else {
                if (typeof deductionEGUIItemsType.eGUIResult !== 'undefined') {
                  for (let a = 0; a < deductionEGUIItemsType.eGUIResult.length; a++) {
                    let _obj = deductionEGUIItemsType.eGUIResult[a]
                    _history_Deduction_EGUIItems.push(_obj)

                    _main.invoice_type = _obj.invoice_type
                    _creditMemoFormatCode = invoiceutility.getAllowanceTaxCode(_obj.format_code)
                  }
                }
              }
            }
          }

          //可扣抵歷史發票
          let _all_Deduction_EGUIItems = meargeHistoryEGUI(_history_Deduction_EGUIItems)
          let _tax_diff_error = checkVoucherTaxDifference(_details)

          if (_net_value * stringutility.convertToFloat(_main.tax_amount) < 0)
            _tax_diff_error = true

          if (_tax_diff_error === true) {
            saveEguiDataResult.message += '稅差超過(' + _tax_diff_balance + ')元 ,請重新調整!'
          }

          if (saveEguiDataResult.message !== '') {
            lockOrUnlockRecord(mainObj, false)

            return

          } else {
            //1.取得折讓單號
            let _today = dateutility.getCompanyLocatDateForClient()

            let _allowanceNumber = invoiceutility.getAllowanceNumber(
              _allowance_pre_code,
              _today
            )
            _allowanceNumberAry.push(_allowanceNumber)

            ////////////////////////////////////////////////////////////////////////////////////////////////////////////
            let _voucherMainRecord = record.create({
              type: _voucher_main_record,
              isDynamic: true
            })

            _voucherMainRecord.setValue({
              fieldId: 'name',
              value: 'VoucherMainRecord'
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_apply_internal_id',
              value: applyId.toString()
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_type',
              value: _voucher_type
            })
            /////////////////////////////////////////////////////////////////
            //20230324 NE-236
            let _gw_dm_mig_type = invoiceutility.getVoucherMigType(_voucher_type)

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_dm_mig_type',
              value: _gw_dm_mig_type
            })
            /////////////////////////////////////////////////////////////////
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_number',
              value: _allowanceNumber
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_date',
              value: _documentDate
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_time',
              value: _documentTime
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_yearmonth',
              value: year_month
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_voucher_sale_tax_apply_period',
              value: _applyPeriod
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller',
              value: _main.company_ban
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller_name',
              value: _main.company_name
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_seller_address',
              value: stringutility.trim(_main.company_address)
            })
            //20201030 walter modify
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_original_buyer_id',
              value: stringutility.trim(_main.customer_id)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer',
              value: _main.buyer_identifier
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_name',
              value: _main.buyer_name
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_address',
              value: stringutility.trim(_main.buyer_address)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_buyer_email',
              value: stringutility.trim(_main.buyer_email)
            })
            //_voucherMainRecord.setValue({fieldId:'custrecord_gw_buyer_dept_code',value:_main.dept_code});	//暫時不用
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_dept_code',
              value: stringutility.trim(_main.dept_code)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_dept_name',
              value: stringutility.trim(_main.dept_code)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_classification',
              value: stringutility.trim(_main.classification)
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_invoice_type',
              value: stringutility.trim(_main.invoice_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_mig_type',
              value: stringutility.trim(_main.mig_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_format_code',
              value: stringutility.trim(_creditMemoFormatCode)
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrier_type',
              value: stringutility.trim(_main.carrier_type)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrierid1',
              value: stringutility.trim(_main.carrier_id)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_carrierid2',
              value: stringutility.trim(_main.carrier_id)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_npoban',
              value: stringutility.trim(_main.npo_ban)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_clearance_mark',
              value: stringutility.trim(_main.customs_clearance_mark)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_main_remark',
              value: stringutility.trim(_main.main_remark)
            })

            if (_main.mig_type == 'C0401') {
              //TODO 要產生隨機碼
              /**
               let _random_number = Math.round(
               invoiceutility.getRandomNum(1000, 9999)
               )
               */
                let _random_number = invoiceutility.getRandomNumNew(
                  _allowanceNumber,
                  _main.company_ban
                )

              _voucherMainRecord.setValue({
                fieldId: 'custrecord_gw_random_number',
                value: _random_number
              })
            }
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_is_printed',
              value: 'N'
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_lock_transaction',
              value: true
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_discount_amount',
              value: 0
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_discount_count',
              value: '0'
            })
            //_voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_owner',value:'1'}); //折讓單專用欄位(1:買方, 2賣方)
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_status',
              value: _status
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_sales_amount',
              value: _net_value * stringutility.convertToFloat(_main.sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_free_sales_amount',
              value:
                _net_value * stringutility.convertToFloat(_main.free_sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_zero_sales_amount',
              value:
                _net_value * stringutility.convertToFloat(_main.zero_sales_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_amount',
              value: _net_value * stringutility.convertToFloat(_main.tax_amount)
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_type',
              value: _main.tax_type
            })
            let _main_tax_rate =
              stringutility.convertToFloat(_main.tax_rate) / 100
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_tax_rate',
              value: _main_tax_rate
            })
            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_total_amount',
              value: _net_value * stringutility.convertToFloat(_main.total_amount)
            })

            if (_main.invoice_type != '07' ||
              _creditMemoFormatCode != '33' ||
              _main.upload_egui_mig == 'NONE') mainObj.assign_log_type = 'NONE'

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_need_upload_egui_mig',
              value: mainObj.assign_log_type
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_upload_status',
              value: mainObj.assign_log_type === 'NONE' ? 'C' : _default_upload_status
            })

            _voucherMainRecord.setValue({
              fieldId: 'custrecord_gw_voucher_main_apply_user_id',
              value: user_id
            })

            try {
              _mainRecordId = _voucherMainRecord.save()

              saveEguiDataResult.forward_voucher_main_id = _mainRecordId
            } catch (e) {
              log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
            }
            //處理detail 分發票開立 [MIX or SINGLE]
            let _item_voucher_open_type = _main.voucher_open_type

            let _gw_ns_document_apply_id_ary = []

            if (_item_voucher_open_type === 'SINGLE') {
              //各自開立
              let _eGUIDetails = _all_Deduction_EGUIItems
              if (typeof _details !== 'undefined') {
                for (let j = 0; j < _details.length; j++) {
                  let _obj = _details[j] //折讓商品清單

                  let _deductionTaxType = _obj.tax_type
                  //20210319 walter modify
                  let _deductionAmount = Math.abs(
                    stringutility.convertToFloat(_obj.item_amount)
                  )

                  //取得折讓扣抵發票清單
                  let _deductionItems = getDeductionInvoiceInformation(
                    _deductionTaxType,
                    _deductionAmount,
                    _eGUIDetails
                  )
                  //alert('取得折讓扣抵發票清單='+JSON.stringify(_deductionItems));
                  if (typeof _deductionItems !== 'undefined') {
                    for (let x = 0; x < _deductionItems.length; x++) {
                      let _voucherObj = _deductionItems[x]

                      let _voucherDetailRecord = record.create({
                        type: 'customrecord_gw_voucher_details',
                        isDynamic: true
                      })

                      _voucherDetailRecord.setValue({
                        fieldId: 'name',
                        value: 'VoucherDetailRecord'
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_apply_internal_id',
                        value: applyId.toString()
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_voucher_main_internal_id',
                        value: _mainRecordId.toString()
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_type',
                        value: _voucher_type
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_description',
                        value: stringutility.trim(_obj.item_name)
                      })
                      //_voucherDetailRecord.setValue({fieldId:'custrecord_gw_unit_price',value:stringutility.trim(_obj.unit_price)});
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_quantity',
                        value:
                          _net_value *
                          stringutility.convertToFloat(_obj.item_quantity)
                      })
                      //紀錄票資料
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_original_gui_internal_id',
                        value: _voucherObj.internalid
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_original_gui_number',
                        value: _voucherObj.voucher_number
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_original_gui_date',
                        value: _voucherObj.voucher_date
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_original_gui_yearmonth',
                        value: _voucherObj.voucher_yearmonth
                      })

                      /////////////////////////////////////////////////////////////////////////////////
                      let _deduction_item_amount = stringutility.convertToFloat(
                        _obj.item_amount
                      )
                      let _deduction_item_tax_amount = stringutility.convertToFloat(
                        _obj.item_tax_amount
                      )
                      let _deduction_item_total_amount = stringutility.convertToFloat(
                        _obj.item_total_amount
                      )
                      if (_deductionTaxType === '1') {
                        _obj.item_amount = (
                          _net_value * _voucherObj.voucher_sales_amount
                        ).toString()
                        //TODO 稅計算
                        _obj.item_tax_amount = (
                          _net_value *
                          _voucherObj.voucher_sales_amount *
                          0.05
                        ).toString()
                      } else if (_deductionTaxType == '2') {
                        _obj.item_amount = (
                          _net_value * _voucherObj.voucher_zero_amount
                        ).toString()
                      } else if (_deductionTaxType == '3') {
                        _obj.item_amount = (
                          _net_value * _voucherObj.voucher_free_amount
                        ).toString()
                      }
                      //單價重設
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_unit_price',
                        value:
                          _net_value *
                          stringutility.convertToFloat(_obj.item_amount)
                      })
                      _obj.item_total_amount =
                        stringutility.convertToFloat(_obj.item_amount) +
                        stringutility.convertToFloat(_obj.item_tax_amount)

                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_amount',
                        value:
                          _net_value *
                          stringutility.convertToFloat(_obj.item_amount)
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_tax_amount',
                        value:
                          _net_value * stringutility.trim(_obj.item_tax_amount)
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_total_amount',
                        value:
                          _net_value * stringutility.trim(_obj.item_total_amount)
                      })
                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_item_tax_code',
                        value: stringutility.trim(_obj.tax_code)
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_item_tax_rate',
                        value: stringutility.trim(_obj.tax_rate)
                      })

                      _row++
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_seq',
                        value: _row.toString()
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_item_remark',
                        value: stringutility.trim(_obj.item_remark)
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_number',
                        value: _allowanceNumber
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_date',
                        value: _documentDate
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_time',
                        value: _documentTime
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_yearmonth',
                        value: year_month
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_status',
                        value: _status
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_upload_status',
                        value: _default_upload_status
                      })

                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_type',
                        value: _obj.document_type
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_apply_id',
                        value: _obj.invoice_id
                      })

                      if (
                        _gw_ns_document_apply_id_ary
                          .toString()
                          .indexOf(_obj.invoice_id) == -1
                      ) {
                        _gw_ns_document_apply_id_ary.push(_obj.invoice_id)
                      }

                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_number',
                        value: _obj.invoice_number
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_number',
                        value: _obj.invoice_number
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_item_id',
                        value: _obj.invoice_seq
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_document_items_seq',
                        value: _obj.invoice_seq
                      })

                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_item_discount_amount',
                        value: '0'
                      })
                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_ns_item_discount_count',
                        value: '0'
                      })

                      _voucherDetailRecord.setValue({
                        fieldId: 'custrecord_gw_dtl_voucher_apply_period',
                        value: _applyPeriod
                      })
                      //20201123 walter modify 紀錄CreditMemo的發票號碼
                      if (_obj.document_type === 'CREDITMEMO') {
                        //1282-CZ94723772
                        let _document_id = _obj.invoice_id + '-' + _voucherObj.voucher_number
                        if (
                          _creditMemoGUINumberAry
                            .toString()
                            .indexOf(_document_id) === -1
                        ) {
                          _creditMemoGUINumberAry.push(_document_id)
                        }
                      }

                      try {
                        _voucherDetailRecord.save()
                      } catch (e) {
                        log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
                      }
                    }
                  }
                }

                //回寫Invoice_Main折扣金額及筆數
                if (typeof _eGUIDetails !== 'undefined') {
                  for (let j = 0; j < _eGUIDetails.length; j++) {
                    let _obj = _eGUIDetails[j]

                    let _internalid = _obj.internalid
                    let _eGUIRecord = record.load({
                      type: _voucher_main_record,
                      id: _internalid,
                      isDynamic: true
                    })

                    _eGUIRecord.setValue({
                      fieldId: 'custrecord_gw_discount_sales_amount',
                      value: _obj.discount_sales_amount
                    })
                    _eGUIRecord.setValue({
                      fieldId: 'custrecord_gw_discount_zero_amount',
                      value: _obj.discount_zero_amount
                    })
                    _eGUIRecord.setValue({
                      fieldId: 'custrecord_gw_discount_free_amount',
                      value: _obj.discount_free_amount
                    })

                    let _discount_amount =
                      stringutility.convertToFloat(_obj.discount_sales_amount) +
                      stringutility.convertToFloat(_obj.discount_zero_amount) +
                      stringutility.convertToFloat(_obj.discount_free_amount)

                    _eGUIRecord.setValue({
                      fieldId: 'custrecord_gw_discount_amount',
                      value: _discount_amount
                    })
                    _eGUIRecord.setValue({
                      fieldId: 'custrecord_gw_discount_count',
                      value: _obj.discount_count
                    })
                    try {
                      _eGUIRecord.save()
                    } catch (e) {
                      log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
                    }
                  }
                }
              }

              try {
                let values = {}
                values['custrecord_gw_is_completed_detail'] = true
                values[
                  'custrecord_gw_ns_transaction'
                  ] = _gw_ns_document_apply_id_ary.toString()
                //values['custrecord_gw_ns_transaction'] = _gw_ns_document_apply_id_ary

                //alert('allowance values='+JSON.stringify(values));
                record.submitFields({
                  type: _voucher_main_record,
                  id: _mainRecordId,
                  values: values,
                  options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                  }
                })
              } catch (e) {
                log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
              }
            } else {
              //合併開立(彙開)
              let _eGUIDetails = _history_Deduction_EGUIItems
              if (typeof _eGUIDetails !== 'undefined') {
                for (let j = 0; j < _eGUIDetails.length; j++) {
                  let _obj = _eGUIDetails[j]

                  const _item_description = '彙開'
                  const _item_quantity = '1'
                  const _item_remark = ''

                  let _voucherDetailRecord = record.create({
                    type: 'customrecord_gw_voucher_details',
                    isDynamic: true
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'name',
                    value: 'VoucherDetailRecord'
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_apply_internal_id',
                    value: applyId.toString()
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_voucher_main_internal_id',
                    value: _mainRecordId.toString()
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_type',
                    value: _voucher_type
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_item_description',
                    value: _item_description
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_unit_price',
                    value: stringutility.trim(_obj.deduction_amount)
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_item_quantity',
                    value: _item_quantity
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_original_gui_internal_id',
                    value: _obj.internalid
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_original_gui_number',
                    value: _obj.voucher_number
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_original_gui_date',
                    value: _obj.voucher_date
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_original_gui_yearmonth',
                    value: _obj.voucher_yearmonth
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_item_amount',
                    value: stringutility.trim(_obj.deduction_amount)
                  })
                  //_voucherDetailRecord.setValue({fieldId:'custrecord_gw_dtl_item_tax_code',value:stringutility.trim(_obj.tax_code)});
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_item_tax_rate',
                    value: stringutility.trim(_main.tax_rate)
                  })

                  _row++
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_item_seq',
                    value: _row.toString()
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_item_remark',
                    value: _item_remark
                  })

                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_number',
                    value: _allowanceNumber
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_date',
                    value: _documentDate
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_time',
                    value: _documentTime
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_yearmonth',
                    value: year_month
                  })

                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_status',
                    value: _status
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_dtl_voucher_upload_status',
                    value: _default_upload_status
                  })

                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_type',
                    value: _obj.document_type
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_apply_id',
                    value: _obj.invoice_id
                  })

                  if (
                    _gw_ns_document_apply_id_ary.toString().indexOf(_obj.invoice_id) === -1
                  ) {
                    _gw_ns_document_apply_id_ary.push(_obj.invoice_id)
                  }

                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_number',
                    value: _obj.invoice_number
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_number',
                    value: _obj.invoice_number
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_item_id',
                    value: _obj.invoice_seq
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_document_items_seq',
                    value: _obj.invoice_seq
                  })

                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_item_discount_amount',
                    value: '0'
                  })
                  _voucherDetailRecord.setValue({
                    fieldId: 'custrecord_gw_ns_item_discount_count',
                    value: '0'
                  })

                  //20201123 walter modify 紀錄CreditMemo的發票號碼
                  if (_obj.document_type === 'CREDITMEMO') {
                    //1282-CZ94723772
                    let _document_id = _obj.invoice_id + '-' + _obj.voucher_number
                    if (
                      _creditMemoGUINumberAry.toString().indexOf(_document_id) === -1
                    ) {
                      _creditMemoGUINumberAry.push(_document_id)
                    }
                  }

                  try {
                    _voucherDetailRecord.save()
                  } catch (e) {
                    log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
                  }

                  //找到發票更新discount及count
                  let _internalid = _obj.internalid
                  let _eGUIRecord = record.load({
                    type: _voucher_main_record,
                    id: _internalid,
                    isDynamic: true
                  })
                  _eGUIRecord.setValue({
                    fieldId: 'custrecord_gw_discount_amount',
                    value: _obj.discount_amount
                  })
                  _eGUIRecord.setValue({
                    fieldId: 'custrecord_gw_discount_count',
                    value: _obj.discount_count
                  })
                  try {
                    _eGUIRecord.save()
                  } catch (e) {
                    log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
                  }
                }
              }

              try {
                let values = {}
                values['custrecord_gw_is_completed_detail'] = true
                values['custrecord_gw_ns_transaction'] = _gw_ns_document_apply_id_ary.toString()

                record.submitFields({
                  type: _voucher_main_record,
                  id: _mainRecordId,
                  values: values,
                  options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                  }
                })
              } catch (e) {
                log.debug('createAllowanceDocument_error', e.name + ':' + e.message)
              }
            }
            //alert('開立折讓單-END');
            //End Details
          }
        }
      }

      let _resultJsonObj = {
        allowanceNumberAry: _allowanceNumberAry,
        creditMemoGUINumberAry: _creditMemoGUINumberAry
      }
      //return _allowanceNumberAry;
      return _resultJsonObj
    }

    //檢查稅差
    function checkVoucherTaxDifference(details) {
      log.audit({
        title: 'checkVoucherTaxDifference - details',
        details: details
      })
      let _tax_diff_error = false
      try {
        let _ns_tax_rate = 0
        let _ns_sales_amount = 0
        let _ns_tax_amount = 0

        if (typeof details !== 'undefined') {
          for (let i = 0; i < details.length; i++) {
            let _obj = details[i]

            let _item_amount = _obj.item_amount
            let _item_tax_amount = _obj.item_tax_amount
            let _item_tax_rate = _obj.tax_rate //5.00

            //紀錄NS應稅金額
            if (stringutility.convertToFloat(_item_tax_rate) !== 0) {
              _ns_sales_amount += stringutility.convertToFloat(_item_amount)
              _ns_tax_rate = stringutility.convertToFloat(_item_tax_rate) / 100
            }
            //紀錄NS的稅額
            _ns_tax_amount += stringutility.convertToFloat(_item_tax_amount)
          }
        }

        if (_tax_diff_balance < 999) {
          log.debug({
            title: 'checkVoucherTaxDifference - before checkTaxDifference',
            details: {
              _ns_sales_amount,
              _ns_tax_rate,
              _ns_tax_amount,
              _tax_diff_balance
            }
          })
          _tax_diff_error = invoiceutility.checkTaxDifference(
            _ns_sales_amount,
            _ns_tax_rate,
            _ns_tax_amount,
            _tax_diff_balance
          )
        }

      } catch (e) {
        log.debug('checkVoucherTaxDifference_error',e.name + ':' + e.message)
      }

      log.audit({
        title: 'checkVoucherTaxDifference - _tax_diff_error',
        details: _tax_diff_error
      })

      return _tax_diff_error
    }

    //更新開立張數
    function updateVoucherApplyListRecord(applyID, guiCount, allowanceCount) {
      let _voucherApplyListRecord = record.load({
        type: 'customrecord_gw_voucher_apply_list',
        id: parseInt(applyID),
        isDynamic: true
      })

      _voucherApplyListRecord.setValue({
        fieldId: 'custrecord_gw_gui_created_count',
        value: guiCount
      })
      _voucherApplyListRecord.setValue({
        fieldId: 'custrecord_gw_allowance_created_count',
        value: allowanceCount
      })

      try {
        _voucherApplyListRecord.save()
      } catch (e) {
        log.debug('updateVoucherApplyListRecord_error', e.name + ':' + e.message)
      }
    }

    //將異動結果回寫到Invoice.custbody_gw_voucher_flow_status = '1'
    function updateInvoiceAndCreditMemoFlowStatus(
      mainObj,
      guiNumberAry,
      allowanceNumberAry,
      creditMemoGUINumberAry
    ) {
      let _invoice_hiddent_listid = mainObj.invoice_selected_listid//invoice_selected_listid
      let _invoce_control_field_value = gwconfigure.lockInvoceControlFieldId()

      if (typeof _invoice_hiddent_listid !== 'undefined') {
        let _idAry = _invoice_hiddent_listid.split(',')
        for (let i = 0; i < _idAry.length; i++) {
          let _internalId = _idAry[i]
          if (parseInt(_internalId) > 0) {
            try {
              let values = {}
              values[_invoce_control_field_id] = _invoce_control_field_value

              if (
                typeof guiNumberAry !== 'undefined' &&
                guiNumberAry.length !== 0
              ) {
                let _egui_start_no = guiNumberAry[0]
                let _egui_end_no = guiNumberAry[guiNumberAry.length - 1]
                values['custbody_gw_gui_num_start'] = _egui_start_no
                values['custbody_gw_gui_num_end'] = _egui_end_no
              }
              if (
                typeof allowanceNumberAry !== 'undefined' &&
                allowanceNumberAry.length !== 0
              ) {
                let _allowance_start_no = allowanceNumberAry[0]
                let _allowance_end_no =
                  allowanceNumberAry[allowanceNumberAry.length - 1]
                values['custbody_gw_allowance_num_start'] = _allowance_start_no
                values['custbody_gw_allowance_num_end'] = _allowance_end_no
              }

              record.submitFields({
                type: record.Type.INVOICE,
                id: parseInt(_internalId),
                values: values,
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              })
            } catch (e) {
              log.debug('updateInvoiceAndCreditMemoFlowStatus_error',e.name + ':' + e.message)
            }
          }
        }
      }
      //////////////////////////////////////////////////////////////////////////////////////////////
      //處理折讓單
      let _creditmemo_hiddent_listid = mainObj.creditmemo_selected_listid
      let _credit_control_field_value = gwconfigure.lockCredMemoControlFieldId()
      if (typeof _creditmemo_hiddent_listid !== 'undefined') {
        let _idAry = _creditmemo_hiddent_listid.split(',')
        for (let i = 0; i < _idAry.length; i++) {
          let _internalId = _idAry[i]
          if (parseInt(_internalId) > 0) {
            try {
              let values = {}
              values[_credmemo_control_field_id] = _credit_control_field_value

              if (
                typeof guiNumberAry !== 'undefined' && guiNumberAry.length !== 0
              ) {
                values['custbody_gw_gui_num_start'] = guiNumberAry[0]
                values['custbody_gw_gui_num_end'] =  guiNumberAry[guiNumberAry.length - 1]
              }
              if (
                typeof allowanceNumberAry !== 'undefined' && allowanceNumberAry.length !== 0
              ) {
                values['custbody_gw_allowance_num_start'] = allowanceNumberAry[0]
                values['custbody_gw_allowance_num_end'] = allowanceNumberAry[allowanceNumberAry.length - 1]
              }

              //20201123 walter modify 處理發票紀錄
              //custbody_gw_creditmemo_deduction_list
              let _deduction_egui_number_list = ''
              if (
                typeof creditMemoGUINumberAry !== 'undefined' && creditMemoGUINumberAry.length !== 0
              ) {
                for (let j = 0; j < creditMemoGUINumberAry.length; j++) {
                  //1282-CZ94723772
                  let _document_id = creditMemoGUINumberAry[j]
                  let _document_id_ary = _document_id.split('-')
                  if (_document_id_ary.length !== 0) {
                    let _ns_credit_memo_id = _document_id_ary[0]
                    let _egui_number = _document_id_ary[1]
                    if (parseInt(_internalId) == parseInt(_ns_credit_memo_id)) {
                      if (
                        _deduction_egui_number_list.indexOf(_egui_number) === -1
                      ) {
                        _deduction_egui_number_list += _egui_number
                      }
                    }
                  }
                }
              }
              values['custbody_gw_creditmemo_deduction_list'] = _deduction_egui_number_list

              record.submitFields({
                type: record.Type.CREDIT_MEMO,
                id: parseInt(_internalId),
                values: values,
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              })
            } catch (e) {
              log.debug('updateInvoiceAndCreditMemoFlowStatus_error',e.name + ':' + e.message)
            }
          }
        }
      }
      //////////////////////////////////////////////////////////////////////////////////////////////
    }

    function updateVoucherDepositRecord(deposit_voucher_hiddent_listid) {
      let _deductedAmountObjAry = JSON.parse(deposit_voucher_hiddent_listid)
      try {
        if (
          typeof _deductedAmountObjAry !== 'undefined' && _deductedAmountObjAry.length !== 0
        ) {
          for (let i = 0; i < _deductedAmountObjAry.length; i++) {
            let _obj = _deductedAmountObjAry[i]
            //alert('Parse _obj='+JSON.stringify(_obj));
            searchAndUpdateVoucherDepositDedcutedAmount(_obj)
          }
        }
      } catch (e) {
        log.debug('updateVoucherDepositRecord_error',e.name + ':' + e.message)
      }
    }


    //檢查發票可扣抵金額
    /**
     * assignLogType : 是否上傳
     * ban  : 統編
     * dept_code : 部門代碼
     * classification : 類別
     * year_month: 期數
     * period : 期別(本期=>this_period, 前期=>early_period)
     * invoiceType : 發票類別(07, 08)
     * taxType : 稅別
     * deductionTotalAmount : 扣抵金額(未稅)
     */
    function geteGUIDeductionItems(
      mig_type,
      assignLogType,
      buyer_id,
      buyer_identifier,
      ban,
      deptCode,
      classification,
      yearMonth,
      voucher_date,
      period,
      deduction_egui_number,
      invoiceType,
      taxType,
      checkField,
      deductionTotalAmount
    ) {
      let _ok = false
      let _objAry = []
      let _search = search.create({
        type: _voucher_main_record,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_voucher_date',
            sort: search.Sort.DESC
          }),
          search.createColumn({ name: 'custrecord_gw_invoice_type' }), //Invoice_Type 07
          search.createColumn({ name: 'custrecord_gw_voucher_format_code' }), //35....
          search.createColumn({ name: 'custrecord_gw_need_upload_egui_mig' }), //ALL, NONE
          search.createColumn({ name: 'custrecord_gw_mig_type' }), //MigType
          search.createColumn({ name: 'custrecord_gw_voucher_number' }), //憑證號碼
          search.createColumn({ name: 'custrecord_gw_voucher_yearmonth' }), //憑證期別
          search.createColumn({ name: 'custrecord_gw_sales_amount' }), //未稅金額
          search.createColumn({ name: 'custrecord_gw_free_sales_amount' }), //免稅金額
          search.createColumn({ name: 'custrecord_gw_zero_sales_amount' }), //零稅金額
          search.createColumn({ name: 'custrecord_gw_discount_count' }), //扣抵次數
          search.createColumn({ name: 'custrecord_gw_discount_sales_amount' }),
          search.createColumn({ name: 'custrecord_gw_discount_free_amount' }),
          search.createColumn({ name: 'custrecord_gw_discount_zero_amount' }),
          search.createColumn({ name: 'custrecord_gw_discount_amount' }) //已扣抵未稅金額
        ]
      })

      let _filterArray = []
      _filterArray.push([
        'custrecord_gw_voucher_upload_status',
        search.Operator.IS,
        'C'
      ])

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_type',
        search.Operator.IS,
        'EGUI'
      ])
      //20211125 walter modify
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_mig_type',
        search.Operator.IS,
        mig_type
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_buyer',
        search.Operator.IS,
        buyer_identifier
      ])
      //20201030 walter modify
      if (buyer_identifier == '0000000000') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_original_buyer_id',
          search.Operator.IS,
          buyer_id
        ])
      }
      _filterArray.push('and')
      _filterArray.push(['custrecord_gw_seller', search.Operator.IS, ban])

      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.LESSTHANOREQUALTO,
        parseInt(voucher_date)
      ])

      //指定發票不分Invoice_type
      if (stringutility.trim(deduction_egui_number) == '') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_invoice_type',
          search.Operator.IS,
          invoiceType
        ])
      }
      //_filterArray.push('and');
      //_filterArray.push(['custrecord_gw_tax_type',search.Operator.IS, taxType]);
      if (checkField === '1') {
        //應稅欄位
        _filterArray.push('and')
        _filterArray.push([
          ['custrecord_gw_tax_type', search.Operator.ISNOT, '2'],
          'and',
          ['custrecord_gw_tax_type', search.Operator.ISNOT, '3']
        ])
      } else if (checkField === '2' || checkField === '3') {
        //零稅欄位(2) | 免稅欄位(3)
        _filterArray.push('and')
        _filterArray.push([
          ['custrecord_gw_tax_type', search.Operator.IS, taxType],
          'or',
          ['custrecord_gw_tax_type', search.Operator.IS, '9']
        ])
      }

      if (period === 'this_period') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_yearmonth',
          search.Operator.IS,
          yearMonth
        ])
      } else if (period === 'early_period') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_voucher_yearmonth',
          search.Operator.LESSTHAN,
          yearMonth
        ])
      } else {
        _filterArray.push('and')

        let deduction_egui_number_ary = deduction_egui_number.split(',')
        let _filter_ary = []
        for (let i = 0; i < deduction_egui_number_ary.length; i++) {
          let _number = deduction_egui_number_ary[i]

          let _sub_filter_ary = []
          _sub_filter_ary.push('custrecord_gw_voucher_number')
          _sub_filter_ary.push(search.Operator.IS)
          _sub_filter_ary.push(_number)

          if (i == 0) {
            _filter_ary.push(_sub_filter_ary)
          } else {
            _filter_ary.push('or')
            _filter_ary.push(_sub_filter_ary)
          }
        }
        _filterArray.push(_filter_ary)
        //_filterArray.push(['custrecord_gw_voucher_number',search.Operator.ANY, deduction_egui_number_ary]);
      }
      //先不檔
      if (assignLogType === 'NONE') {
        //_filterArray.push('and');
        //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.IS, 'NONE']);
      } else {
        //_filterArray.push('and');
        //_filterArray.push(['custrecord_gw_need_upload_egui_mig',search.Operator.ISNOT, 'NONE']);
      }
      _search.filterExpression = _filterArray
      //alert('geteGUIDeductionItems filterArray='+JSON.stringify(_filterArray));
      let _amountSum = 0
      let _result = _search.run().getRange({
        start: 0,
        end: 1000
      })

      for (let i = 0; i < _result.length; i++) {
        let _internalid = _result[i].id

        let _mig_type = _result[i].getValue({
          name: 'custrecord_gw_mig_type'
        })
        //發票號碼
        let _voucher_number = _result[i].getValue({
          name: 'custrecord_gw_voucher_number'
        })
        let _voucher_date = _result[i].getValue({
          name: 'custrecord_gw_voucher_date'
        })
        let _voucher_yearmonth = _result[i].getValue({
          name: 'custrecord_gw_voucher_yearmonth'
        })
        let _discount_count = _result[i].getValue({
          name: 'custrecord_gw_discount_count'
        })
        //未稅金額
        let _sales_amount = _result[i].getValue({
          name: 'custrecord_gw_sales_amount'
        })
        //免稅金額
        let _free_sales_amount = _result[i].getValue({
          name: 'custrecord_gw_free_sales_amount'
        })
        //零稅金額
        let _zero_sales_amount = _result[i].getValue({
          name: 'custrecord_gw_zero_sales_amount'
        })
        //已折金額(未稅)
        let _discount_amount = _result[i].getValue({
          name: 'custrecord_gw_discount_amount'
        })

        let _discount_sales_amount = _result[i].getValue({
          name: 'custrecord_gw_discount_sales_amount'
        })
        let _discount_free_amount = _result[i].getValue({
          name: 'custrecord_gw_discount_free_amount'
        })
        let _discount_zero_amount = _result[i].getValue({
          name: 'custrecord_gw_discount_zero_amount'
        })

        let _gw_invoice_type = _result[i].getValue({
          name: 'custrecord_gw_invoice_type'
        })
        let _gw_voucher_format_code = _result[i].getValue({
          name: 'custrecord_gw_voucher_format_code'
        })
        let _gw_need_upload_egui_mig = _result[i].getValue({
          name: 'custrecord_gw_need_upload_egui_mig'
        })
        ///////////////////////////////////////////////////////////////////////////////////
        //可扣抵餘額
        let _balance_amount = 0
        if (checkField == '1') {
          //應稅欄位
          _balance_amount =
            stringutility.convertToFloat(_sales_amount) -
            stringutility.convertToFloat(_discount_sales_amount)
        } else if (checkField == '2') {
          //零稅欄位
          _balance_amount =
            stringutility.convertToFloat(_zero_sales_amount) -
            stringutility.convertToFloat(_discount_zero_amount)
        } else if (checkField == '3') {
          //免稅欄位
          _balance_amount =
            stringutility.convertToFloat(_free_sales_amount) -
            stringutility.convertToFloat(_discount_free_amount)
        }

        _amountSum += _balance_amount

        if (deductionTotalAmount >= _balance_amount) {
          let _obj = {
            internalid: _internalid,
            mig_type: _mig_type,
            invoice_type: _gw_invoice_type,
            format_code: _gw_voucher_format_code,
            upload_egui_mig: _gw_need_upload_egui_mig,
            voucher_number: _voucher_number,
            voucher_date: _voucher_date,
            voucher_yearmonth: _voucher_yearmonth,
            voucher_sales_amount: stringutility.convertToFloat(_sales_amount),
            voucher_free_amount: stringutility.convertToFloat(_free_sales_amount),
            voucher_zero_amount: stringutility.convertToFloat(_zero_sales_amount),
            discount_count: stringutility.convertToFloat(_discount_count) + 1, //折讓次數累計
            deduction_amount: _balance_amount, //本次折讓金額
            deduction_field: checkField, //扣抵欄位
            discount_sales_amount: stringutility.convertToFloat(_discount_sales_amount), //扣抵應稅欄位
            discount_zero_amount: stringutility.convertToFloat(_discount_zero_amount), //扣抵零稅欄位
            discount_free_amount: stringutility.convertToFloat(_discount_free_amount), //扣抵免稅欄位
            discount_amount: stringutility.convertToFloat(_discount_amount) //折讓金額累計
          }

          if (checkField == '1') {
            //應稅欄位
            _obj.discount_sales_amount = stringutility.convertToFloat(_sales_amount)
            _obj.discount_amount = stringutility.convertToFloat(_sales_amount)
          } else if (checkField == '2') {
            //零稅欄位
            _obj.discount_zero_amount = stringutility.convertToFloat(_zero_sales_amount)
            _obj.discount_amount = stringutility.convertToFloat(_zero_sales_amount)
          } else if (checkField == '3') {
            //免稅欄位
            _obj.discount_free_amount = stringutility.convertToFloat(_free_sales_amount)
            _obj.discount_amount = stringutility.convertToFloat(_free_sales_amount)
          }
          //扣掉金額
          deductionTotalAmount -= _balance_amount
          _objAry.push(_obj)
        } else if (deductionTotalAmount != 0) {
          _discount_count = stringutility.convertToFloat(_discount_count) + 1
          //_discount_amount = deductionTotalAmount+stringutility.convertToFloat(_discount_amount);

          let _obj = {
            internalid: _internalid,
            mig_type: _mig_type,
            invoice_type: _gw_invoice_type,
            format_code: _gw_voucher_format_code,
            upload_egui_mig: _gw_need_upload_egui_mig,
            voucher_number: _voucher_number,
            voucher_date: _voucher_date,
            voucher_yearmonth: _voucher_yearmonth,
            voucher_sales_amount: stringutility.convertToFloat(_sales_amount),
            voucher_free_amount: stringutility.convertToFloat(_free_sales_amount),
            voucher_zero_amount: stringutility.convertToFloat(_zero_sales_amount),
            discount_count: _discount_count,
            deduction_amount: deductionTotalAmount,
            deduction_field: checkField, //扣抵欄位
            discount_sales_amount: stringutility.convertToFloat(_discount_sales_amount), //扣抵應稅欄位
            discount_zero_amount: stringutility.convertToFloat(_discount_zero_amount), //扣抵零稅欄位
            discount_free_amount: stringutility.convertToFloat(_discount_free_amount), //扣抵免稅欄位
            discount_amount: stringutility.convertToFloat(_discount_amount)
          }

          if (checkField == '1') {
            //應稅欄位
            _obj.discount_sales_amount =
              stringutility.convertToFloat(deductionTotalAmount) +
              stringutility.convertToFloat(_discount_sales_amount)
            _obj.discount_amount =
              deductionTotalAmount +
              stringutility.convertToFloat(deductionTotalAmount)
          } else if (checkField == '2') {
            //零稅欄位
            _obj.discount_zero_amount =
              stringutility.convertToFloat(deductionTotalAmount) +
              stringutility.convertToFloat(_discount_zero_amount)
            _obj.discount_amount =
              deductionTotalAmount +
              stringutility.convertToFloat(deductionTotalAmount)
          } else if (checkField == '3') {
            //免稅欄位
            _obj.discount_free_amount =
              stringutility.convertToFloat(deductionTotalAmount) +
              stringutility.convertToFloat(_discount_free_amount)
            _obj.discount_amount =
              deductionTotalAmount +
              stringutility.convertToFloat(deductionTotalAmount)
          }

          _objAry.push(_obj)
          break
        }
      }

      if (_amountSum >= deductionTotalAmount) _ok = true

      let _checkObj = {
        checkResult: _ok,
        eGUIResult: _objAry
      }

      return _checkObj
    }

    //整理歷史發票
    function meargeHistoryEGUI(historyEGUIItems) {
      let _tempAry = []
      try {
        if (typeof historyEGUIItems !== 'undefined') {
          for (let i = 0; i < historyEGUIItems.length; i++) {
            let _eguiObj = historyEGUIItems[i]
            let _voucher_number = _eguiObj.voucher_number

            if (_tempAry.length == 0) {
              _tempAry.push(_eguiObj)
            } else {
              let _isExist = false
              for (let j = 0; j < _tempAry.length; j++) {
                let _tempObj = _tempAry[j]
                let _temp_voucher_number = _tempObj.voucher_number

                if (_temp_voucher_number == _voucher_number) {
                  //_tempObj.discount_count = stringutility.convertToInt(_tempObj.discount_count) + stringutility.convertToInt(_eguiObj.discount_count);

                  _tempObj.deduction_amount =
                    stringutility.convertToFloat(_tempObj.deduction_amount) +
                    stringutility.convertToFloat(_eguiObj.deduction_amount)

                  _tempObj.discount_sales_amount =
                    stringutility.convertToFloat(_tempObj.discount_sales_amount) +
                    stringutility.convertToFloat(_eguiObj.discount_sales_amount)
                  _tempObj.discount_zero_amount =
                    stringutility.convertToFloat(_tempObj.discount_zero_amount) +
                    stringutility.convertToFloat(_eguiObj.discount_zero_amount)
                  _tempObj.discount_free_amount =
                    stringutility.convertToFloat(_tempObj.discount_free_amount) +
                    stringutility.convertToFloat(_eguiObj.discount_free_amount)

                  _tempObj.discount_amount =
                    stringutility.convertToFloat(_tempObj.discount_sales_amount) +
                    stringutility.convertToFloat(_tempObj.discount_zero_amount) +
                    stringutility.convertToFloat(_tempObj.discount_free_amount)

                  _tempAry[j] = _tempObj
                  _isExist = true

                  break
                }
              }
              if (_isExist == false) {
                _tempAry.push(_eguiObj)
              }
            }
          }
        }
      } catch (e) {
        log.debug('meargeHistoryEGUI_error',e.name + ':' + e.message)
      }

      return _tempAry
    }

    //取得稅別資料
    function getTaxInformation(netsuiteId) {
      let _taxObj
      try {
        if (taxObjAry != null) {
          for (let i = 0; i < taxObjAry.length; i++) {
            let _obj = JSON.parse(JSON.stringify(taxObjAry[i]))

            if (_obj.netsuite_id_value == netsuiteId) {
              _taxObj = _obj
              break
            }
          }
        }
      } catch (e) {
        log.debug(e.name, e.message)
      }

      return _taxObj
    }

    function searchAndUpdateVoucherDepositDedcutedAmount(_obj) {
      try {
        if (typeof _obj !== 'undefined') {
          let _assign_document_id = stringutility.convertToInt(
            _obj.assign_document_id
          )
          let _tax_type = _obj.tax_type
          let _invoice_dedcuted_amount = stringutility.convertToFloat(
            _obj.dedcuted_amount
          )

          let _mySearch = search.create({
            type: 'customrecord_gw_deposit_voucher_record',
            columns: [
              search.createColumn({
                name: 'custrecord_gw_deposit_dedcuted_amount'
              }),
              search.createColumn({ name: 'custrecord_gw_deposit_egui_amount' })
            ]
          })

          let _filterArray = []
          _filterArray.push([
            'custrecord_gw_assign_document_id',
            search.Operator.EQUALTO,
            _assign_document_id
          ])
          _filterArray.push('and')
          _filterArray.push([
            'custrecord_gw_deposit_egui_tax_type',
            search.Operator.IS,
            _tax_type
          ])
          _mySearch.filterExpression = _filterArray
          //alert('Parse _filterArray='+JSON.stringify(_filterArray));

          _mySearch.run().each(function (result) {
            let _internalid = result.id

            let _deposit_egui_amount = result.getValue({
              name: 'custrecord_gw_deposit_egui_amount'
            })
            let _deposit_dedcuted_amount = result.getValue({
              name: 'custrecord_gw_deposit_dedcuted_amount'
            })

            //
            let _balance_amount = _deposit_egui_amount - _deposit_dedcuted_amount
            //alert('deposit_egui_amount='+_deposit_egui_amount+' ,deposit_dedcuted_amount='+_deposit_dedcuted_amount+' ,_balance_amount='+_balance_amount);
            if (_invoice_dedcuted_amount >= _balance_amount) {
              _deposit_dedcuted_amount = _deposit_egui_amount
              _invoice_dedcuted_amount -= _balance_amount
            } else {
              _deposit_dedcuted_amount += _invoice_dedcuted_amount
            }

            /////////////////////////////////////////////////////////////////////////////////
            //update _deposit_dedcuted_amount
            let values = {}
            values[
              'custrecord_gw_deposit_dedcuted_amount'
              ] = _deposit_dedcuted_amount

            record.submitFields({
              type: 'customrecord_gw_deposit_voucher_record',
              id: _internalid,
              values: values,
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
              }
            })
            /////////////////////////////////////////////////////////////////////////////////
            return true
          })
        }
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }
    }

    //取得折讓單扣抵發票資料
    function getDeductionInvoiceInformation(
      deductionTaxType,
      deductionAmount,
      eGUIDetails
    ) {
      let _invoiceObjAry = []
      if (typeof eGUIDetails !== 'undefined') {
        for (let i = 0; i < eGUIDetails.length; i++) {
          let _obj = eGUIDetails[i]
          let _deduction_obj = JSON.parse(JSON.stringify(_obj))
          let _amount = 0

          if (deductionTaxType === '1') {
            _amount = Math.abs(_obj.voucher_sales_amount)
          } else if (deductionTaxType === '2') {
            _amount = Math.abs(_obj.voucher_zero_amount)
          } else if (deductionTaxType === '3') {
            _amount = Math.abs(_obj.voucher_free_amount)
          }
          //排除0元歷史發票不處理 20200320 walter
          if (_amount === 0 && deductionAmount !== 0) continue

          if (deductionAmount >= stringutility.convertToFloat(_amount)) {
            //金額扣完
            if (deductionTaxType === '1') {
              _obj.voucher_sales_amount = '0'
              _deduction_obj.voucher_sales_amount = stringutility.convertToFloat(_amount)
            } else if (deductionTaxType === '2') {
              _obj.voucher_zero_amount = '0'
              _deduction_obj.voucher_zero_amount = stringutility.convertToFloat(_amount)
            } else if (deductionTaxType === '3') {
              _obj.voucher_free_amount = '0'
              _deduction_obj.voucher_free_amount = stringutility.convertToFloat(_amount)
            }

            deductionAmount = deductionAmount - stringutility.convertToFloat(_amount)

          } else {
            if (deductionTaxType === '1') {
              _obj.voucher_sales_amount = stringutility.convertToFloat(_amount) - deductionAmount
              _deduction_obj.voucher_sales_amount = deductionAmount
            } else if (deductionTaxType === '2') {
              _obj.voucher_zero_amount = stringutility.convertToFloat(_amount) - deductionAmount
              _deduction_obj.voucher_zero_amount = deductionAmount
            } else if (deductionTaxType === '3') {
              _obj.voucher_free_amount = stringutility.convertToFloat(_amount) - deductionAmount
              _deduction_obj.voucher_free_amount = deductionAmount
            }

            deductionAmount = 0
          }

          _invoiceObjAry.push(JSON.parse(JSON.stringify(_deduction_obj)))

          if (deductionAmount === 0) break
        }
      }
      return _invoiceObjAry
    }

    return { onRequest }

  })
