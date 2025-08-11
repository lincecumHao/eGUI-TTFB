define([], function () {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2020 Gateweb
   * @author Sean Lin <seanlin816@gmail.com>
   *
   * @NApiVersion 2.0
   * @NModuleScope Public

   */
  var exports = {}
  exports.TaxTypeError = {
    code: 'TAX_TYPE_NOT_VALID',
    message: 'Tax Type is not valid',
    chtMessage: '應稅類別錯誤',
  }

  //region GUI Number
  exports.GuiFormatError = {
    code: 'GUI_FORMAT_ERROR',
    message:
      'GUI Format is incorrect, should be 2 capital letter and 8 digits of number',
    chtMessage: '發票號碼格式錯誤, 應為大寫英文字母2位及8位數字',
  }
  exports.GuiTrackError = {
    code: 'GUI_TRACK_ERROR',
    message: 'GUI Track letters is invalid',
    chtMessage: '發票字軌錯誤',
  }
  exports.GuiNumberCommonNumberConflictError = {
    code: 'GUI_COMMON_CAN_ONLY_HAVE_ONE',
    message: 'GUI Number and Common number should choose 1',
    chtMessage: '發票號碼與其他憑證號碼請擇一輸入',
  }
  exports.GuiNumberMustNotHaveValueError = {
    code: 'GUI_NUMBER_MUST_NOT_HAVE',
    message: 'GUI Number Cannot have value',
    chtMessage: '發票號碼不可填',
  }
  exports.GuiNumberRequired = {
    code: 'GUI_NUMBER_REQUIRED',
    message: 'GUI Number Cannot have value',
    chtMessage: '發票號碼必填',
  }
  exports.GuiNumberDuplicated = {
    code: 'GUI_NUMBER_DUPLICATE',
    message: 'GUI Number already existed',
    chtMessage: '發票號碼重複',
  }
  exports.GuiVoided = {
    code: 'GUI_VOIDED',
    message: 'GUI is voided',
    chtMessage: '發票已作廢',
  }
  //endregion

  //region Common Number
  exports.CommonNumberSimilarToGuiNumber = {
    code: 'COMMON_NUMBER_SIMILAR_GUI_NUMBER',
    message: 'Common Number can not be similar to Gui Number',
    chtMessage: '其他憑證號碼不可與發票號碼格式相似 (2位英文字母與8位數字)',
  }

  exports.CommonNumberFormatError = {
    code: 'COMMON_NUMBER_FORMAT_ERROR',
    message: 'Common Number format error',
    chtMessage: '其他憑證號碼格式錯誤 (10位數字或英文)',
  }

  exports.CommonNumberRequired = {
    code: 'COMMON_NUMBER_REQUIRED',
    message: 'Common Number Required',
    chtMessage: '其他憑證號碼必填',
  }

  exports.CommonNumberMustNotHave = {
    code: 'COMMON_NUMBER_MUST_NOT_HAVE',
    message: 'Common Number Must not have',
    chtMessage: '其他憑證號碼不可填',
  }

  exports.CommonNumberMustNotDuplicate = function(ids) {
    var chtMessage = '其他憑證號碼在相同年月中僅能出現一次';
    if(ids && ids.length > 0) {
      chtMessage += '<br/> 已出現於: <br/>' + ids.join('<br/>');
    }
    return {
      code: 'COMMON_NUMBER_MUST_NOT_DUPLICATE',
      message: 'Common Number Must not duplicate',
      chtMessage: chtMessage,
    }
  }

  exports.CommonNumberCustomLenthError = {
    code: 'COMMON_NUMBER_CUSTOM_LENGTH_ERROR',
    message: 'Common Number Custom Length is incorrect',
    chtMessage: '長度錯誤, 其他憑證號碼應14碼進口海關代徵號碼',
  }
  //endregion

  //region buyer tax id
  exports.BuyerTaxIdRequired = {
    code: 'BUYER_TAX_ID_REQUIRED',
    message: 'Buyer tax id is required',
    chtMessage: '買方統編必填',
  }
  exports.BuyerTaxIdNotValid = {
    code: 'BUYER_TAX_ID_NOT_VALID',
    message: 'Buyer tax id not valid',
    chtMessage: '買方統編錯誤',
  }
  exports.BuyerTaxIdLengthNotValid = {
    code: 'BUYER_TAX_ID_LENGTH_NOT_VALID',
    message: 'Buyer tax id length not valid',
    chtMessage: '買方統編長度不合, 應為8碼數字',
  }
  //endregion

  //region seller tax id
  exports.SellerTaxIdRequired = {
    code: 'SELLER_TAX_ID_REQUIRED',
    message: 'Seller tax id is required',
    chtMessage: '賣方統編必填',
  }
  exports.SellerTaxIdMustNotHave = {
    code: 'SELLER_TAX_ID_MUST_NOT_HAVE',
    message: 'Seller tax id must not have value',
    chtMessage: '賣方統編不可填',
  }
  exports.SellerTaxIdLengthError = {
    code: 'SELLER_TAX_ID_LENGTH_ERROR',
    message: 'Seller tax id should be 8 digits of number',
    chtMessage: '賣方統編應為 8 位數字',
  }
  exports.SellerTaxIdValueError = {
    code: 'SELLER_TAX_ID_NOT_VALID',
    message: 'Seller tax id is not a valid tax id',
    chtMessage: '賣方統編錯誤',
  }
  //endregion

  // Sales Amount
  exports.SalesAmtLengthError = {
    code: 'LENGTH_ERROR',
    message: 'Sales amount should be less than 12 digits',
    chtMessage: '銷售額長度限長12位數',
  }
  exports.SalesAmtShouldBeZero = {
    code: 'SHOULD_BE_ZERO',
    message: 'Sales amount should be 0',
    chtMessage: '銷售額應為 0',
  }
  exports.SalesAmtShouldBeGreaterThanZero = {
    code: 'SHOULD_GREATER_THAN_ZERO',
    message: 'Sales amount should be less than 12 digits',
    chtMessage: '銷售額應大於 0',
  }

  // Tax Amount
  exports.TaxAmtLengthError = {
    code: 'TAX_AMOUNT_LENGTH_ERROR',
    message: 'Tax amount should be less than 12 digits',
    chtMessage: '稅額長度限長12位數',
  }
  exports.TaxAmtOver5Error = {
    code: 'TAX_AMOUNT_EXCEED_FIVE_DOLLAR',
    message: 'Tax amount is over 5 dollar range',
    chtMessage: '稅差超過5元',
  }
  exports.TaxAmtOverError = function(x) {
    return {
      code: 'TAX_AMOUNT_EXCEED_FIVE_DOLLAR',
        message: 'Tax amount is over 5 dollar range',
      chtMessage: `稅差超過${x}元`,
    }
  }
  exports.TaxAmtOver500Error = {
    code: 'TAX_AMOUNT_EXCEED_FIVE_HUNDRED',
    message: 'Tax amount is over 500 dollar ＊ consolidationQty',
    chtMessage: '若憑證代號為26或27時則稅金不可超過500元 * 彙總數量',
  }

  // Tax ID
  exports.TaxIdLengthError = {
    code: 'TAX_ID_LENGTH_ERROR',
    message: 'Tax id should be 8 digits of number',
    chtMessage: '統編應為 8 位數字或 10 位 0',
  }
  exports.TaxIdValueError = {
    code: 'TAX_ID_NOT_VALID',
    message: 'Tax id is not a valid tax id',
    chtMessage: '非正確統編',
  }

  // 匯總數量
  exports.ConsolidationQty = {
    code: 'CONSOLIDATION_QTY_ERROR',
    message: 'Consolidation qty should be greater then 1 if 匯總或分攤註記 is "A-彙加"',
    chtMessage: '如 "匯總或分攤註記" 為 "A-彙加", "匯總數量" 應大於 1',
  }
  return exports
})
