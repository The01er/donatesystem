# Соглашение по `data-testid`

## Формат

```
{category}-{entity}-{action}
```

Все значения — **kebab-case**. Категории:

| Категория | Префикс | Назначение |
|---|---|---|
| `btn` | кнопка | `btn-buy-{id}`, `btn-submit-order` |
| `input` | поле ввода | `input-email`, `input-player-name` |
| `block` | контейнер/секция | `block-checkout`, `block-top-donators` |
| `table` | таблица | `table-orders` |
| `row` | строка таблицы | `row-order-{id}` |
| `status` | статус | `order-status-{id}`, `coupon-status` |
| `label` | лейбл/чекбокс | `label-consent` |
| `modal` | модалка | `modal-confirm` |

## Примеры для всех компонентов

```html
<!-- ShopTemplateClassic / ShopTemplateGaming -->
<button :data-testid="`btn-buy-${product.id}`">Купить</button>
<span :data-testid="`product-name-${product.id}`">{{ product.name }}</span>
<span :data-testid="`product-price-${product.id}`">₽{{ product.price }}</span>
<span data-testid="product-soldout">Распродано</span>
<input data-testid="input-coupon" />
<button data-testid="btn-apply-coupon">OK</button>
<p data-testid="coupon-status">{{ couponSuccess }}</p>
<div data-testid="block-top-donators">...</div>
<div :data-testid="`donator-${index}`">...</div>

<!-- ShopCheckout -->
<div data-testid="block-checkout">...</div>
<input data-testid="input-email" />
<input data-testid="input-player-name" />
<input data-testid="input-consent" />
<label data-testid="label-consent">...</label>
<span data-testid="checkout-total">₽{{ total }}</span>
<button data-testid="btn-submit-order">Оплатить</button>
<button data-testid="btn-close-checkout">×</button>

<!-- Dashboard orders table -->
<tr :data-testid="`row-order-${o.id}`">...</tr>
<span :data-testid="`order-status-${o.id}`">{{ o.status }}</span>
<span :data-testid="`order-amount-${o.id}`">₽{{ o.totalAmount }}</span>
<button :data-testid="`btn-revoke-${o.id}`">Отозвать</button>
<button :data-testid="`btn-regrant-${o.id}`">Выдать снова</button>

<!-- ConfirmModal -->
<div data-testid="modal-confirm">...</div>
<span data-testid="modal-title">Подтверждение</span>
<p data-testid="modal-message">Вы уверены?</p>
<button data-testid="btn-confirm-yes">Да</button>
<button data-testid="btn-confirm-no">Нет</button>

<!-- Dashboard common -->
<h1 data-testid="dashboard-title">Мои серверы</h1>
<button data-testid="btn-create-server">+ Создать сервер</button>
<button data-testid="btn-create-first-server">Создать первый сервер</button>
<input data-testid="input-server-name" />
<input data-testid="input-server-slug" />
<select data-testid="select-game-type"></select>
<button data-testid="btn-submit-create-server">Создать</button>

<!-- Login page -->
<input data-testid="input-email" />
<input data-testid="input-password" />
<button data-testid="btn-submit">Войти</button>
<a data-testid="link-register">Зарегистрироваться</a>
<a data-testid="link-forgot-password">Забыли пароль?</a>
<input data-testid="input-consent" />

<!-- Onboarding -->
<div data-testid="block-onboarding">...</div>
<button data-testid="btn-next-step">Далее</button>
<button data-testid="btn-finish-onboarding">В дашборд</button>
```

## Правила

1. `data-testid` добавляются только к интерактивным элементам (кнопки, инпуты, чекбоксы) и контейнерам, которые проверяются в E2E-тестах.
2. Для динамических ID (product.id, order.id) используется `:data-testid="\`pref-${id}\`"`.
3. Атрибуты не дублируются: если на элементе уже есть `data-testid`, это единственный селектор для теста.
4. Один testid на один DOM-узел — вложенные элементы с testid не проверяются.
5. Одинаковые testid в разных шаблонах витрины (Classic / Gaming / Compact) — гарантируют единый PageObject.
6. testid не меняются при рефакторинге стилей или перестановке DOM.
