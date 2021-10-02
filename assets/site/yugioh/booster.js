const cardTemplate = (
    '<div class="card">' +
        '<img alt="{{name}}" src="/api/yugioh/card/{{code}}" />' +
    '</div>'
)
const flipCardTemplate = (
    '<div class="flip-card {{rarity}}">' +
        '<div class="flip-card-inner card">' +
            '<div class="flip-card-front">' +
                '<div class="flip-card_effect"></div>' +
                '<img alt="Back of Card" src="/api/yugioh/card/BACK" />' +
            '</div>' +
            '<div class="flip-card-back">' +
                '<div class="flip-card_effect"></div>' +
                '<img alt="{{name}}" src="/api/yugioh/card/{{code}}" />' +
            '</div>' +
        '</div>' +
    '</div>'
)
const booster_code = window.location.pathname.split('/').pop()

function openBooster() {
    $.ajax({
        url: '/api/yugioh/open/' + booster_code,
        type: "GET",
        data: {},
        success: function (data) {
            renderCards('.cards', data.booster)
        },
        error: function (error) {
            $('.cards').html('<p>' + error.responseText + '</p>')
        }
    })
}

function renderCards(selector, cards) {
    $(selector).html(
        Mustache.render(
            '{{#.}}' +
                flipCardTemplate +
            '{{/.}}'
        , cards)
    )

    $('.flip-card').on('click', function(e) {
        $(this).addClass('flip');
    })
}

openBooster()