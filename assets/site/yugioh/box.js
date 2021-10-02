const cardTemplate = (
    '<div class="card">' +
        '<img alt="{{name}}" src="/api/yugioh/card/{{code}}" />' +
    '</div>'
)
const owner_code = window.location.pathname.split('/').pop()

function openBooster() {
    $.ajax({
        url: '/api/yugioh/get-cards/' + owner_code,
        type: "GET",
        data: {},
        success: function (cards) {
            renderCards('.card-box', cards)
        },
        error: function (error) {
            $('.card-box').html('<p>' + error.responseText + '</p>')
        }
    })
}

function renderCards(selector, cards) {
    $(selector).html(
        Mustache.render(
            '{{#.}}' +
                cardTemplate +
            '{{/.}}'
        , cards)
    )
}

openBooster()