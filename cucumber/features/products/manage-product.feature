Feature: Manage Product

  Background:
    Given I am logged in and on the Products page

  @regression @products @update
  Scenario: Merchant updates a product name
    Given a product exists in the listing
    When I open the product
    And I update the product title with a generated updated name
    And I click Save Changes
    Then the updated product name should appear in the listing
    And the original product name should not appear in the listing

  @regression @products @delete
  Scenario: Merchant deletes a product from the detail page
    Given a product exists in the listing
    When I open the product
    And I delete the product from the detail page
    Then the page should navigate back to the products listing
    And the deleted product should not appear in the listing

  @regression @products @delete
  Scenario: Merchant deletes a product using bulk delete from listing
    Given a product exists in the listing
    When I delete the product from the listing
    Then the deleted product should not appear in the listing

  @regression @products @delete
  Scenario: Merchant cancels a bulk delete and product remains
    Given a product exists in the listing
    When I cancel the bulk delete of the product
    Then the product should still appear in the listing

  @smoke @products @search
  Scenario: Merchant searches for a product by name
    Given a product exists in the listing
    When I search for the product by name
    Then the product should appear in the search results

  @regression @products @search
  Scenario: Search with no match shows No data message
    When I search for "NOMATCH_XYZ_9999_DOESNOTEXIST"
    Then the No data message should be visible
