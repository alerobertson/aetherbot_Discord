const cardTemplate = (
    '<div class="card {{rarity}}" card-name="{{name}}" card-code="{{code}}"><a class="inspect-card" href="#inspect">' +
        '<div class="card_effect"></div>' +
        '<img alt="{{name}}" src="/yugioh/card/{{code}}" />' +
    '</a></div>'
)
const owner_code = window.location.pathname.split('/').pop()

function copyArray(array) {
    let new_array = [...array]
    return new_array
}

function openBooster() {
    $.ajax({
        url: '/yugioh/get-cards/' + owner_code,
        type: "GET",
        data: {},
        success: function (cards) {
            cards = sanitizeCards(cards)
            window.cards = copyArray(cards)
            window.cards = sortBy(window.cards, 'name', true)
            console.log(window.cards)
            renderCards('.card-box', window.cards)
        },
        error: function (error) {
            $('.card-box').html('<p>' + error.responseText + '</p>')
        }
    })
}

function onCardClick(e) {
    e.preventDefault();
    let $card_info = $(this).closest('.card')
    let code = $card_info.attr('card-code')
    let image_url = $card_info.find('img').attr('src')
    $.fancybox.open(`<img src="${image_url}"/>`);
}

function rarityIndex(rarity) {
    return ['common', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].indexOf(rarity)
}

function convertToInt(string) {
    if(string == undefined || string == null) { return string }
    let value = parseInt(string)
    return isNaN(value) ? 0 : value
}

function sanitizeCards(cards) {
    return cards.map((card) => {
        card.rarity_index = rarityIndex(card.rarity)
        card.attack = convertToInt(card.attack)
        card.defense = convertToInt(card.defense)
        return card
    })
}

// true = ascending, false = descending
function sortBy(cards, key, direction) {
    cards = cards.filter(card => card[key] != undefined)

    return cards.sort((a, b) => {
        if(a[key] < b[key]) {
            return direction ? -1 : 1
        }
        if(a[key] > b[key]) {
            return direction ? 1 : -1
        }
        return 0
    })
}

function renderCards(selector, cards) {
    $(selector).html(
        Mustache.render(
            '{{#.}}' +
                cardTemplate +
            '{{/.}}'
        , cards)
    ).promise().done(() => {
        $('a.inspect-card').on('click', onCardClick)
    })

}

$('select.filter').on('change', () => {
    let type = $('select.filter.sorting-type').val()
    let direction = $('select.filter.sorting-direction').val() === 'true'
    if(type == 'name') { direction = !direction }

    let cards = copyArray(window.cards)
    cards = sortBy(cards, 'name', !direction)
    cards = sortBy(cards, type, direction)

    renderCards('.card-box', cards)
})

openBooster()