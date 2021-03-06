
import Private from './vtex-minicart.private.js';

const _private = new Private();

export default {
    cart: {
        items: {},
        itemCount: 0,
    },

    init() {
        _private._setInstance(this);

        this.bindData();
        this.fillCart();
        this.updateItem();
        this.removeItem();
    },

    bindData() {
        rivets.bind(this.$element, {
            controller: this,
            cart: this.cart,
        });
    },

    fillCart() {
        _private._requestStartEvent();

        vtexjs.checkout.getOrderForm().done((orderForm) => {
            let orderFormItems = orderForm.items;

            if ( !this.option.showGifts ) {
                orderFormItems = orderFormItems.filter((item) => !item.isGift);
            }

            const totalVal = this.globalHelpers.objectSearch(orderForm.totalizers, {id: 'Items'});
            this.$element.find('[data-minicart-subtotal]').html(this.vtexHelpers.formatPrice(totalVal.value || 0));
            this.cart.itemCount = orderFormItems.length;
            this.cart.items = orderFormItems;

            if ( this.cart.itemCount > 0 ) {
                const sumQuantity = orderFormItems.reduce((acc, obj) => acc + obj.quantity, 0);
                $('[data-minicart-amount]').text(_private._setPadding(sumQuantity));

                for ( let index = 0, len = orderFormItems.length; index < len; index += 1 ) {
                    const _item = orderFormItems[index];

                    if ( _item.sellingPrice === _item.listPrice ) {
                        this.cart.items[index].listPrice = 0;
                    }

                    this.cart.items[index].imageUrl = this.globalHelpers.stripHttp(this.cart.items[index].imageUrl);
                    this.cart.items[index].index = index;

                    // Items is on cache
                    $.ajax({
                        url: '/api/catalog_system/pub/products/search?fq=productId:' + _item.productId,
                    }).then((product) => {
                        let productSkuSearch = [];

                        if ( product.length ) {
                            productSkuSearch = product[0].items.filter((sku) => parseInt(sku.itemId, 10) === parseInt(_item.id, 10));
                        }

                        this.cart.items[index].productFullInfo = product[0];
                        this.cart.items[index].productSkuSearch = productSkuSearch[0];
                    });

                    // Check API with prices
                    vtexjs.catalog.getProductWithVariations(_item.productId).done((product) => {
                        const productSkuVariations = product.skus.filter((sku) => parseInt(sku.sku, 10) === parseInt(_item.id, 10));

                        this.cart.items[index].productSkuVariations = (this.option.camelizeItems) ? this.globalHelpers.camelize(productSkuVariations[0]) : productSkuVariations[0];
                    });
                }

                _private._debug();
            } else {
                $('[data-minicart-amount]').text(_private._setPadding(0));
            }
        }).always((orderForm) => {
            _private._requestEndEvent(orderForm);
        });
    },

    removeItem() {
        $(document).on('click', '[data-minicart-item-remove]', (ev) => {
            const index = $(ev.currentTarget).data('minicartIndex');
            _private._removeItem(index);
        });
    },

    updateItem() {
        $(document).on('click', '[data-minicart-item-qty]', (ev) => {
            ev.preventDefault();
            const $this = $(ev.currentTarget);
            const itemQtyVal = $this.parent().find('[data-minicart-item-qty-val]');
            const index = itemQtyVal.data('minicartIndex');
            let availableQty = itemQtyVal.data('minicartAvailablequantity');
            let oldVal = itemQtyVal.val();
            let newVal = 0;

            availableQty = ( availableQty ) ? availableQty : 99999;

            if ( $this.data('minicartItemQty') === '+' ) {
                newVal = parseFloat(oldVal) + 1;

                if ( newVal > parseInt(availableQty) ) {
                    return false;
                }
            } else {
                if ( oldVal > 0 ) {
                    newVal = parseFloat(oldVal) - 1;

                    if ( newVal === 0 ) {
                        _private._removeItem(index);

                        return false;
                    }
                } else {
                    newVal = 0;
                }
            }

            _private._updateItem(index, newVal);
        });
    },
};
